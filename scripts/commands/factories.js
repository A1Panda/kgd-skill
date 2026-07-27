function createHandlerFactories(deps) {
  const {
    createAuthContext,
    getAuthOverrides,
    openApiPost,
    printJson,
    toBool,
    toInt,
  } = deps;

  function buildPaginationBody(args, defaultPageSize = 20) {
    return {
      pageNo: toInt(args.page, 1),
      pageSize: toInt(args["page-size"], defaultPageSize),
    };
  }

  function buildKeywordListBody(args, keywordField = "keyword", defaultPageSize = 20) {
    return {
      [keywordField]: args.keyword ? String(args.keyword) : "",
      ...buildPaginationBody(args, defaultPageSize),
    };
  }

  function normalizeScopedString(value) {
    if (value === undefined || value === null) {
      return "";
    }
    return String(value).trim();
  }

  function pickFirstArgValue(args, argNames) {
    for (const argName of argNames) {
      const rawValue = args[argName];
      if (rawValue === undefined || rawValue === null) {
        continue;
      }
      if (typeof rawValue === "boolean") {
        return rawValue;
      }
      if (String(rawValue).trim() !== "") {
        return rawValue;
      }
    }
    return undefined;
  }

  function buildScopedListBody(args, options = {}) {
    const {
      commandName = "list",
      defaultPageSize = 20,
      scopeFields = [],
      allowEmptyScope = false,
    } = options;

    const body = buildPaginationBody(args, defaultPageSize);
    let hasScope = false;

    for (const scopeField of scopeFields) {
      const argNames = Array.isArray(scopeField.args) ? scopeField.args : [scopeField.arg];
      const rawValue = pickFirstArgValue(args, argNames);
      if (rawValue === undefined) {
        continue;
      }

      let normalizedValue;
      switch (scopeField.type) {
        case "int": {
          normalizedValue = toInt(rawValue, 0);
          if (!normalizedValue) {
            continue;
          }
          break;
        }
        case "bool-int": {
          normalizedValue = toBool(rawValue) ? 1 : 0;
          break;
        }
        default: {
          normalizedValue = normalizeScopedString(rawValue);
          if (!normalizedValue) {
            continue;
          }
          break;
        }
      }

      body[scopeField.field] = normalizedValue;
      hasScope = true;
    }

    if (!allowEmptyScope && !hasScope) {
      throw new Error(
        `${commandName} 请至少提供一个检索范围条件，例如 --code、--keyword、--updated-at-start/--updated-at-end；不要直接做无范围查询。`,
      );
    }

    return body;
  }

  function createListHandler(apiPath, buildBody) {
    return async (args) => {
      const requestBody = buildBody(args);
      const context = await createAuthContext(getAuthOverrides(args));
      const json = await openApiPost(context, apiPath, requestBody);
      printJson(json);
    };
  }

  function createWriteHandler(options) {
    return async (args) => {
      const apiPath = typeof options.apiPath === "function" ? options.apiPath(args) : options.apiPath;
      let payload = options.loadPayload(args);
      let context;

      const getContext = async () => {
        if (!context) {
          context = await createAuthContext(getAuthOverrides(args));
        }
        return context;
      };

      if (options.preparePayload) {
        payload = await options.preparePayload(payload, { args, getContext });
      }

      if (toBool(args["dry-run"])) {
        printJson({
          dry_run: true,
          api: apiPath,
          payload,
        });
        return;
      }

      const authContext = await getContext();
      if (options.supportsBatch && Array.isArray(payload)) {
        const results = [];
        for (const item of payload) {
          results.push(await openApiPost(authContext, apiPath, item));
        }
        printJson({
          success: true,
          data: results,
        });
        return;
      }

      const json = await openApiPost(authContext, apiPath, payload);
      printJson(json);
    };
  }

  return {
    buildPaginationBody,
    buildKeywordListBody,
    buildScopedListBody,
    createListHandler,
    createWriteHandler,
  };
}

module.exports = {
  createHandlerFactories,
};
