export interface SupportedModel {
  /** The exact value accepted in a Scheduled Task's `model` front-matter field. */
  id: string;
  /** Shown in the dedicated /schedules UI's model selector. */
  label: string;
}

/**
 * Fixed, code-defined catalog of models an owner may assign to a Scheduled
 * Task (spec.md FR-004, Assumptions — "decided at the infrastructure level,
 * not an arbitrary free-text model name"). Not owner-editable, not stored in
 * S3. Update this list to change what's assignable.
 */
export const SUPPORTED_MODELS: SupportedModel[] = [
  { id: "mistral-large-latest", label: "Mistral Large" },
  { id: "mistral-medium-latest", label: "Mistral Medium" },
  { id: "mistral-small-latest", label: "Mistral Small" },
  { id: "codestral-latest", label: "Codestral" },
];

export function isSupportedModel(id: string): boolean {
  return SUPPORTED_MODELS.some((model) => model.id === id);
}
