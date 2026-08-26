"use client";

import { useId, useState } from "react";
import {
  FormError,
  FormField,
  FormLabel,
  FormTextarea,
} from "@/components/design-system";
import { LUMINA_MESSAGE_MAX_LENGTH } from "@/lib/lumina/conversation";

type LuminaComposerProps = {
  label: string;
  placeholder: string;
  sendLabel: string;
  sendingLabel: string;
  disabled: boolean;
  errorMessage?: string | null;
  onSend: (content: string) => void;
};

export function LuminaComposer({
  label,
  placeholder,
  sendLabel,
  sendingLabel,
  disabled,
  errorMessage,
  onSend,
}: LuminaComposerProps) {
  const fieldId = useId();
  const errorId = `${fieldId}-error`;
  const [value, setValue] = useState("");

  const trimmed = value.trim();
  const canSend =
    !disabled &&
    trimmed.length > 0 &&
    trimmed.length <= LUMINA_MESSAGE_MAX_LENGTH;

  const submit = () => {
    if (!canSend) {
      return;
    }
    onSend(trimmed);
    setValue("");
  };

  return (
    <form
      className="bh-lumina-chat-composer"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <FormField>
        <FormLabel htmlFor={fieldId}>{label}</FormLabel>
        <FormTextarea
          id={fieldId}
          name="message"
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          rows={3}
          maxLength={LUMINA_MESSAGE_MAX_LENGTH}
          hasError={Boolean(errorMessage)}
          aria-invalid={Boolean(errorMessage) || undefined}
          aria-describedby={errorMessage ? errorId : undefined}
          className="bh-lumina-chat-composer-input"
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
        />
        {errorMessage ? (
          <FormError id={errorId}>{errorMessage}</FormError>
        ) : null}
      </FormField>

      <div className="bh-lumina-chat-composer-actions">
        <button
          type="submit"
          className="bh-lumina-chat-send"
          disabled={!canSend}
        >
          {disabled ? sendingLabel : sendLabel}
        </button>
      </div>
    </form>
  );
}
