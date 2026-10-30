import { Component, useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import type { Confirmation } from '../shared/domain';
import { receiptMailto, receiptRole, receiptTime, receiptTrack } from '../shared/receipt';

class ReceiptCode extends Component<{ text: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { console.error('Receipt QR generation failed', error); }
  render() {
    if (this.state.failed) return <>
      <p className="error" role="alert">Your attendance is saved, but the QR code could not be generated. Try again or photograph the details below.</p>
      <button type="button" onClick={() => this.setState({ failed: false })}>Retry QR code</button>
    </>;
    return <QRCodeSVG className="receipt-qr" value={this.props.text} size={600} level="M" marginSize={4}
      role="img" title="QR code that opens a pre-filled check-in confirmation email" />;
  }
}

export function Receipt({ receipt, onDone }: { receipt: Confirmation; onDone: () => void }) {
  const [remaining, setRemaining] = useState(120);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  useEffect(() => {
    const timer = setInterval(() => setRemaining(value => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => { if (remaining === 0) onDone(); }, [remaining, onDone]);
  const actions = <div className="receipt-actions">
    <button type="button" className="secondary" onClick={() => setRemaining(120)}>Keep receipt open</button>
    <button type="button" onClick={onDone}>Done / clear receipt</button>
  </div>;
  return <section className="success receipt" aria-labelledby="receipt-heading">
    <h2 id="receipt-heading" tabIndex={-1} ref={heading}>You are checked in, {receipt.name}!</h2>
    <p>{receipt.alreadyCheckedIn ? 'Your existing check-in was found. No duplicate registration was created.' : 'Your attendance has been saved.'}</p>
    <h3>Attendance receipt</h3>
    <p>Review your registered details below. If anything is incorrect, ask registration staff to correct it before saving your receipt.</p>
    <p>Scan this QR code with your phone camera to open a pre-filled email to yourself, then tap Send to keep it as your check-in receipt. You can also photograph this confirmation.</p>
    <ReceiptCode key={receipt.receiptId} text={receiptMailto(receipt)} />
    <dl className="receipt-details">
      <dt>Event</dt><dd>Norwegian FHIR Hackathon 2026</dd>
      <dt>When and where</dt><dd>9 November 2026 - Rebel, Oslo</dd>
      <dt>Name</dt><dd>{receipt.name}</dd>
      <dt>Email</dt><dd>{receipt.email}</dd>
      <dt>Affiliation / organization</dt><dd>{receipt.affiliation}</dd>
      <dt>Role</dt><dd>{receiptRole(receipt.role)}</dd>
      <dt>Primary track</dt><dd>{receiptTrack(receipt.track)}</dd>
      <dt>Checked in (Oslo time)</dt><dd>{receiptTime(receipt.arrived)}</dd>
      <dt>Receipt reference</dt><dd>{receipt.receiptId}</dd>
    </dl>
    <p className="muted">This receipt confirms check-in, not duration of participation. It is not digitally signed.</p>
    <p className="muted">The receipt includes your email address. Keep your saved copy private. This screen clears in {remaining} seconds.</p>
    {actions}
  </section>;
}
