import { actions, isInputError } from "astro:actions";
import Form from "@rjsf/shadcn";
import type { RJSFSchema, UiSchema } from "@rjsf/utils";
import validator from "@rjsf/validator-ajv8";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Spinner } from "./ui/Spinner";

type ActionName = "saveResume" | "savePrefs" | "saveApplication";
type Props = {
  schema: RJSFSchema;
  uiSchema?: UiSchema;
  data: unknown;
  action: ActionName;
  /** Wrap the form data under this key; otherwise it is spread into the input. */
  field?: string;
  /** Extra fixed input for the action, such as an id. */
  payload?: Record<string, unknown>;
  reloadOnSave?: boolean;
  submitLabel?: string;
};

type Save = (
  input: unknown,
) => Promise<{ error?: { message: string } | undefined }>;

/**
 * A form generated entirely from a JSON Schema, calling an Astro action.
 * Zod validates again on the server.
 */
export default function SchemaForm({
  schema,
  uiSchema,
  data,
  action,
  field,
  payload,
  reloadOnSave,
  submitLabel = "Save changes",
}: Props) {
  const [saving, setSaving] = useState(false);

  const submit = async ({ formData }: { formData?: unknown }) => {
    setSaving(true);
    const input = field
      ? { ...payload, [field]: formData }
      : { ...payload, ...(formData as object) };
    const { error } = await (actions[action] as unknown as Save)(input);
    setSaving(false);
    if (error) {
      toast.error(
        isInputError(error) ? "Some fields need a fix." : error.message,
      );
      return;
    }
    toast.success("Saved");
    if (reloadOnSave) {
      window.location.reload();
    }
  };

  return (
    <Form
      schema={schema}
      uiSchema={uiSchema}
      formData={data}
      validator={validator}
      onSubmit={submit}
    >
      <Button type="submit" disabled={saving} className="mt-6">
        {saving && <Spinner />}
        {submitLabel}
      </Button>
    </Form>
  );
}
