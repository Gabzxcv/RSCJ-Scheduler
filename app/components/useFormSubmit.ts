"use client";

import { startTransition, useCallback, useEffect, useRef, type FormEvent } from "react";

/**
 * Sends a form to a server action WITHOUT React 19's automatic form reset.
 * With a plain `action={...}` form, a failed save (for example a schedule
 * conflict) clears every uncontrolled field, which is painful on a phone.
 * Pass `resetWhen` (a value that becomes truthy after a successful save) to
 * clear the form only when the save worked.
 */
export function useFormSubmit(action: (formData: FormData) => void, resetWhen?: unknown) {
  const ref = useRef<HTMLFormElement>(null);
  const onSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const data = new FormData(event.currentTarget, submitter);
    startTransition(() => action(data));
  }, [action]);
  useEffect(() => {
    if (resetWhen) ref.current?.reset();
  }, [resetWhen]);
  return { ref, onSubmit };
}
