export function AmazonCompliancePage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-cl-text">Amazon Compliance Console</h1>
          <p className="text-cl-text-secondary mt-1">Monitor inbound plan creation, packing submission, labels, tracking sync, and exceptions.</p>
        </div>
        <span className="inline-block ml-2 px-2 py-0.5 rounded-full bg-cl-accent/15 text-cl-accent text-xs font-semibold">Compliance</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-cl-dark border border-cl-panel rounded-xl p-5">
          <h2 className="text-lg font-semibold text-cl-text mb-4">Integration checkpoints</h2>
          <ul className="space-y-3">
            <li className="bg-cl-dark border border-cl-panel rounded-lg p-4 flex items-center gap-3">
              <span className="text-cl-success">&#10003;</span>
              <span className="text-cl-text-secondary">Create inbound plan</span>
            </li>
            <li className="bg-cl-dark border border-cl-panel rounded-lg p-4 flex items-center gap-3">
              <span className="text-cl-success">&#10003;</span>
              <span className="text-cl-text-secondary">Submit packing information</span>
            </li>
            <li className="bg-cl-dark border border-cl-panel rounded-lg p-4 flex items-center gap-3">
              <span className="text-cl-success">&#10003;</span>
              <span className="text-cl-text-secondary">Confirm placement and transportation</span>
            </li>
            <li className="bg-cl-dark border border-cl-panel rounded-lg p-4 flex items-center gap-3">
              <span className="text-cl-warning">&#9888;</span>
              <span className="text-cl-text-secondary">Retrieve labels / BOL</span>
            </li>
            <li className="bg-cl-dark border border-cl-panel rounded-lg p-4 flex items-center gap-3">
              <span className="text-cl-warning">&#9888;</span>
              <span className="text-cl-text-secondary">Sync tracking / appointment details</span>
            </li>
          </ul>
        </div>
        <div className="bg-cl-dark border border-cl-panel rounded-xl p-5">
          <h2 className="text-lg font-semibold text-cl-text mb-4">Exception queue</h2>
          <p className="text-cl-text-secondary">No live exceptions wired yet. Connect this page to the integration event store next.</p>
        </div>
      </div>
    </div>
  )
}
