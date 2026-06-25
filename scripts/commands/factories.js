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

  function createListHandler(apiPath, buildBody) {
    return async (args) => {
      const context = await createAuthContext(getAuthOverrides(args));
      const json = await openApiPost(context, apiPath, buildBody(args));
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
    createListHandler,
    createWriteHandler,
  };
}

module.exports = {
  createHandlerFactories,
};
