import { ApprovedCopySlot } from "@/components/blueprint/approved-copy-slot";
import { PrintPage } from "@/components/blueprint/print/print-page";
import type { BlueprintPrintVariant } from "@/content/blueprint/types";
import type { ChapterPrintExercise } from "@/lib/blueprint/chapter-print-content";

type ExercisePageProps = {
  variant?: BlueprintPrintVariant;
  header: string;
  exerciseIndex: number;
  exercise?: ChapterPrintExercise | null;
  writingLines?: number;
  responseLines?: readonly string[];
};

export function ExercisePage({
  variant = "print",
  header,
  exerciseIndex,
  exercise,
  writingLines,
  responseLines,
}: ExercisePageProps) {
  const lines = writingLines ?? exercise?.writingLines ?? 14;

  return (
    <PrintPage variant={variant} header={header} className="bh-bp-exercise-page">
      <p className="bh-bp-exercise-label">
        {exercise?.heading ?? `Exercise ${exerciseIndex}`}
      </p>
      <h2 className="bh-bp-exercise-title">
        {exercise?.title ?? exercise?.heading ?? `Exercise ${exerciseIndex}`}
      </h2>
      {exercise?.instructions?.length ? (
        <div className="bh-bp-exercise-instructions">
          {exercise.instructions.map((line, index) => (
            <p key={index}>{line}</p>
          ))}
        </div>
      ) : null}
      {exercise?.examples?.length ? (
        <div className="bh-bp-exercise-examples">
          <p className="bh-bp-exercise-examples-label">Examples</p>
          {exercise.examples.map((line, index) => (
            <p key={index}>{line}</p>
          ))}
        </div>
      ) : null}
      <ApprovedCopySlot
        label={`Exercise ${exerciseIndex} writing space`}
        manuscript={null}
        variant="lines"
        placeholderLines={lines}
        responseLines={responseLines}
      />
    </PrintPage>
  );
}
