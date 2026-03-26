import Handlebars from "handlebars";
import type { WorkflowContext } from "../types";
import { getTemplateContext } from "./runtime-context";

type PatchedHandlebars = typeof Handlebars & {
  __nodebaseRuntimePatched?: boolean;
};

const patchedHandlebars = Handlebars as PatchedHandlebars;

if (!patchedHandlebars.__nodebaseRuntimePatched) {
  const originalCompile = Handlebars.compile.bind(Handlebars);

  Handlebars.registerHelper("json", (context) => {
    return new Handlebars.SafeString(JSON.stringify(context, null, 2));
  });

  Handlebars.compile = ((input, options) => {
    const compiled = originalCompile(input, options);

    return ((context, runtimeOptions) =>
      compiled(
        getTemplateContext((context ?? {}) as WorkflowContext),
        runtimeOptions,
      )) as ReturnType<typeof Handlebars.compile>;
  }) as typeof Handlebars.compile;

  patchedHandlebars.__nodebaseRuntimePatched = true;
}

export { Handlebars };
