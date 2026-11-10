import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AttendanceTotals } from '../src/AttendanceTotals';

describe('staff dashboard attendance tiles', () => {
  it('shows attendee and staff counts first in their own highlighted row', () => {
    const markup = renderToStaticMarkup(createElement(AttendanceTotals, {
      totals: { attendees: 12, staffCheckedIn: 3, roster: 20, staff: 5, checkedIn: 14, rosterMissing: 8, staffMissing: 2, manual: 1, trackLeads: 2 }
    }));
    const sections = markup.match(/<section.*?<\/section>/g);
    expect(sections).toHaveLength(2);
    expect(sections![0]).toContain('class="metrics metrics-primary"');
    expect(sections![0]).toContain('<strong>12</strong><span>Attendees checked in</span>');
    expect(sections![0]).toContain('<strong>3</strong><span>Staff checked in</span>');
    expect(sections![0]!.match(/class="metric metric-highlight"/g)).toHaveLength(2);
    expect(sections![1]!.match(/class="metric"/g)).toHaveLength(7);
    expect(sections![1]).not.toContain('<button');
    expect(sections![1]).toContain('<strong>2</strong><span>Track leads here</span>');
    expect(sections![1]).not.toContain('metric-highlight');
    expect(sections![1]).not.toContain('Staff checked in');
  });

  it('makes the missing tiles clickable when the lists are available', () => {
    const markup = renderToStaticMarkup(createElement(AttendanceTotals, {
      totals: { attendees: 1, staffCheckedIn: 1, roster: 2, staff: 2, checkedIn: 2, rosterMissing: 1, staffMissing: 1, manual: 0, trackLeads: 0 },
      missing: { attendees: [], staff: [] }
    }));
    expect(markup.match(/<button/g)).toHaveLength(2);
    expect(markup).toContain('Sign-ups not here</span></button>');
    expect(markup).toContain('Staff not here</span></button>');
  });
});
