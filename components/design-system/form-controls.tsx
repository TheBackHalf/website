import { cn } from "@/lib/utils";

type FormFieldProps = {
  children: React.ReactNode;
  className?: string;
};

export function FormField({ children, className }: FormFieldProps) {
  return <div className={cn("bh-form-field", className)}>{children}</div>;
}

type FormLabelProps = React.ComponentPropsWithoutRef<"label">;

export function FormLabel({ className, ...props }: FormLabelProps) {
  return <label className={cn("bh-form-label", className)} {...props} />;
}

type FormInputProps = React.ComponentPropsWithoutRef<"input"> & {
  hasError?: boolean;
};

export function FormInput({ className, hasError, ...props }: FormInputProps) {
  return (
    <input
      className={cn("bh-form-input", hasError && "bh-form-input-error", className)}
      {...props}
    />
  );
}

type FormTextareaProps = React.ComponentPropsWithoutRef<"textarea"> & {
  hasError?: boolean;
};

export function FormTextarea({ className, hasError, ...props }: FormTextareaProps) {
  return (
    <textarea
      className={cn(
        "bh-form-input bh-form-textarea",
        hasError && "bh-form-input-error",
        className,
      )}
      {...props}
    />
  );
}

type FormSelectProps = React.ComponentPropsWithoutRef<"select"> & {
  hasError?: boolean;
  disabled?: boolean;
};

export function FormSelect({
  className,
  hasError,
  disabled,
  ...props
}: FormSelectProps) {
  return (
    <select
      className={cn(
        "bh-form-input",
        disabled && "bh-form-input-disabled",
        hasError && "bh-form-input-error",
        className,
      )}
      disabled={disabled}
      {...props}
    />
  );
}

type FormErrorProps = {
  id?: string;
  children: React.ReactNode;
  className?: string;
};

export function FormError({ id, children, className }: FormErrorProps) {
  return (
    <p id={id} className={cn("bh-form-error", className)} role="alert">
      {children}
    </p>
  );
}

type FormHelperProps = {
  id?: string;
  children: React.ReactNode;
  className?: string;
};

export function FormHelper({ id, children, className }: FormHelperProps) {
  return (
    <p id={id} className={cn("bh-form-helper", className)}>
      {children}
    </p>
  );
}

type FormPanelProps = {
  children: React.ReactNode;
  className?: string;
};

export function FormPanel({ children, className }: FormPanelProps) {
  return <div className={cn("bh-support-form", className)}>{children}</div>;
}

type StatusNoticeProps = {
  children: React.ReactNode;
  variant?: "pending" | "success" | "error";
  className?: string;
  id?: string;
};

export function StatusNotice({
  children,
  variant = "pending",
  className,
  id,
}: StatusNoticeProps) {
  return (
    <div
      id={id}
      className={cn(
        variant === "success" && "bh-status-success",
        variant === "error" && "bh-status-error",
        variant === "pending" && "bh-support-pending-notice",
        className,
      )}
      role="status"
    >
      {children}
    </div>
  );
}
