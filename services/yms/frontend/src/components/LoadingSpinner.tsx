export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="w-10 h-10 border-4 border-cl-panel border-t-cl-accent rounded-full animate-spin" />
    </div>
  );
}
