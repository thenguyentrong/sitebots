export function ViewerSkeleton() {
  return (
    <div className="card flex aspect-[4/3] items-center justify-center" data-robot-viewer data-ready="false">
      <p className="rounded-full border border-edge bg-card px-3 py-1 text-sm text-faint shadow-sm">Loading 3D model</p>
    </div>
  );
}
