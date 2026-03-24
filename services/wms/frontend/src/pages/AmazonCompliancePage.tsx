export function AmazonCompliancePage() {
  return (
    <div className="grid">
      <div className="section-header">
        <div>
          <h1>Amazon Compliance Console</h1>
          <p>Monitor inbound plan creation, packing submission, labels, tracking sync, and exceptions.</p>
        </div>
        <span className="badge">Compliance</span>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h2>Integration checkpoints</h2>
          <ul>
            <li>Create inbound plan</li>
            <li>Submit packing information</li>
            <li>Confirm placement and transportation</li>
            <li>Retrieve labels / BOL</li>
            <li>Sync tracking / appointment details</li>
          </ul>
        </div>
        <div className="card">
          <h2>Exception queue</h2>
          <p>No live exceptions wired yet. Connect this page to the integration event store next.</p>
        </div>
      </div>
    </div>
  )
}
