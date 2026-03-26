import Handlebars from "handlebars";
import type { WorkflowContext } from "../types";
import { getTemplateContext } from "./runtime-context";

let helpersRegistered = false;

const ensureHelpers = () => {
  if (helpersRegistered) {
    return;
  }

  Handlebars.registerHelper("json", (context) => {
    return new Handlebars.SafeString(JSON.stringify(context, null, 2));
  });

  helpersRegistered = true;
};

export const compileTemplate = (template: string, context: WorkflowContext) => {
  ensureHelpers();
  return Handlebars.compile(template)(getTemplateContext(context));
};
