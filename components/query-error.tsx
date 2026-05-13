interface QueryErrorProps {
  error: Error | null;
}

export function QueryError({ error }: QueryErrorProps) {
  if (!error) {
    return null;
  }

  return (
    <div className="rounded-md border border-destructive/20 bg-destructive/10 p-4">
      <p className="text-destructive text-sm">{error.message}</p>
    </div>
  );
}
