import { render, screen, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { AuditMissSummary } from '@/components/case-study/audit-miss-summary';
import { AuditNotes } from '@/components/case-study/audit-notes';
import { AuditTable } from '@/components/case-study/audit-table';
import { CaseStudyContent } from '@/components/case-study/case-study-content';
import { CaseStudySection } from '@/components/case-study/case-study-section';
import { ExternalLink } from '@/components/case-study/external-link';
import { LinksSection } from '@/components/case-study/links-section';
import { PerformanceSection } from '@/components/case-study/performance-section';
import { TitledItems } from '@/components/case-study/titled-items';
import { CASE_STUDY_LINKS, loadAuditReports, type AuditReport } from '@/content/case-study';
import en from '@messages/en.json';
import th from '@messages/th.json';
import { resolveServerTree } from '../helpers/resolve-server-tree';

vi.mock(
  'next-intl/server',
  async () => (await import('../helpers/intl-server-mock')).serverIntlModule,
);

async function renderServer(element: Promise<ReactElement | null>): Promise<void> {
  render(<>{await resolveServerTree(await element)}</>);
}

const { latest, earlier } = loadAuditReports();
const p1 = earlier.find((report) => report.id === 'p1') as AuditReport;
const p2 = earlier.find((report) => report.id === 'p2') as AuditReport;

describe('ExternalLink (FR-062)', () => {
  it('opens in a new tab without an opener and announces it', () => {
    render(
      <ExternalLink href="https://example.test/x" newTabLabel="opens in a new tab">
        Source
      </ExternalLink>,
    );
    const link = screen.getByRole('link', { name: /Source/ });
    expect(link).toHaveAttribute('href', 'https://example.test/x');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(link.getAttribute('rel')).toContain('noreferrer');
    expect(link).toHaveAccessibleName('Source opens in a new tab');
  });
});

describe('CaseStudySection and TitledItems (FR-062)', () => {
  it('names the section by its h2 and shows the lead sentence only when given', () => {
    const { rerender } = render(
      <CaseStudySection id="x" heading="Heading" intro="Lead">
        <p>Body</p>
      </CaseStudySection>,
    );
    expect(screen.getByRole('region', { name: 'Heading' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Heading' })).toBeInTheDocument();
    expect(screen.getByText('Lead')).toBeInTheDocument();
    rerender(<CaseStudySection id="x" heading="Heading" />);
    expect(screen.queryByText('Lead')).not.toBeInTheDocument();
  });

  it('renders each item as an h3 with its paragraph', () => {
    render(
      <TitledItems
        items={[
          { id: 'a', title: 'Alpha', body: 'First' },
          { id: 'b', title: 'Beta', body: 'Second' },
        ]}
      />,
    );
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByRole('heading', { level: 3, name: 'Beta' })).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });
});

describe.each([
  ['en', en],
  ['th', th],
] as const)('audit table in %s (FR-062)', (locale, messages) => {
  it('has a caption, column and row headers, and one row per audited route', async () => {
    await renderServer(AuditTable({ locale, report: latest }));
    const table = screen.getByTestId('audit-p3');
    expect(table).toHaveAccessibleName(
      messages.caseStudy.performance.caption.replace(
        '{run}',
        messages.caseStudy.performance.run.p3,
      ),
    );
    const columns = within(table).getAllByRole('columnheader');
    expect(columns).toHaveLength(8);
    for (const column of columns) expect(column).toHaveAttribute('scope', 'col');
    expect(within(table).getAllByRole('row')).toHaveLength(latest.routes.length + 1);
    for (const header of within(table).getAllByRole('rowheader')) {
      expect(header).toHaveAttribute('scope', 'row');
    }
  });

  it('prints the stored numbers: score out of 100, LCP seconds, TBT ms, CLS 3 dp', async () => {
    await renderServer(AuditTable({ locale, report: latest }));
    const first = latest.routes[0];
    if (!first) throw new Error('no routes');
    const row = screen.getByRole('rowheader', { name: first.route }).closest('tr');
    if (!row) throw new Error('no row');
    const cells = within(row).getAllByRole('cell');
    expect(cells).toHaveLength(7);
    expect(cells[0]).toHaveTextContent(String(Math.round(first.performance * 100)));
    expect(cells[4]).toHaveTextContent((first.lcpMs / 1000).toFixed(2));
    expect(cells[5]).toHaveTextContent(String(Math.round(first.tbtMs)));
    expect(cells[6]).toHaveTextContent(first.cls.toFixed(3));
  });

  it('links the source file in a new tab and explains the noindex Preview', async () => {
    await renderServer(AuditTable({ locale, report: latest }));
    const link = screen.getByRole('link', { name: new RegExp(latest.file) });
    expect(link).toHaveAttribute('href', latest.url);
    expect(link).toHaveAttribute('target', '_blank');
    expect(screen.getByText(messages.caseStudy.performance.notePreview)).toBeInTheDocument();
    expect(screen.getByTestId('audit-p3')).toHaveAttribute('aria-describedby', 'audit-p3-note');
  });

  it('omits the Preview note for a run on the live site', async () => {
    await renderServer(AuditTable({ locale, report: p1 }));
    expect(screen.queryByText(messages.caseStudy.performance.notePreview)).not.toBeInTheDocument();
    expect(screen.getByTestId('audit-p1')).not.toHaveAttribute('aria-describedby');
  });
});

describe('audit notes and miss summary (FR-062)', () => {
  it('states the pass line for a run that met every budget', async () => {
    await renderServer(AuditNotes({ locale: 'en', report: latest }));
    expect(screen.getByText(en.caseStudy.performance.gatePassed)).toBeInTheDocument();
  });

  it('states each missed budget with the actual value, limit and the phase that fixed it', async () => {
    await renderServer(AuditNotes({ locale: 'en', report: p1 }));
    const text = screen.getByRole('listitem').textContent ?? '';
    expect(text).toContain('Largest contentful paint (LCP)');
    expect(text).toContain('/th/collections/foundations');
    expect(text).toContain('2.51');
    expect(text).toContain('2.50');
    expect(text).toContain('phase 2 run passed it');
    expect(screen.queryByText(en.caseStudy.performance.gatePassed)).not.toBeInTheDocument();
  });

  it('shows a miss in Thai with the Thai phase name', async () => {
    await renderServer(AuditNotes({ locale: 'th', report: p1 }));
    expect(screen.getByRole('listitem').textContent).toContain('เฟส 2');
  });

  it('renders no summary when every earlier run passed', async () => {
    const { container } = render(
      <>{await resolveServerTree(await AuditMissSummary({ locale: 'en', reports: [p2] }))}</>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('surfaces the earlier miss outside the disclosure', async () => {
    await renderServer(AuditMissSummary({ locale: 'en', reports: [p2, p1] }));
    const summary = screen.getByTestId('audit-miss-summary');
    expect(within(summary).getAllByRole('listitem')).toHaveLength(1);
    expect(summary).toHaveTextContent('Phase 1 missed a budget');
    expect(summary).toHaveTextContent('/th/collections/foundations');
  });
});

describe('performance section (FR-062)', () => {
  it('shows the latest run open and earlier runs inside a closed disclosure', async () => {
    await renderServer(PerformanceSection({ locale: 'en' }));
    expect(
      screen.getByRole('heading', { level: 2, name: en.caseStudy.performance.heading }),
    ).toBeInTheDocument();
    const details = document.querySelector('details');
    expect(details).not.toBeNull();
    expect(details).not.toHaveAttribute('open');
    expect(within(details as HTMLElement).getByTestId('audit-p2')).toBeInTheDocument();
    expect(within(details as HTMLElement).getByTestId('audit-p1')).toBeInTheDocument();
    expect(within(details as HTMLElement).queryByTestId('audit-p3')).not.toBeInTheDocument();
    expect(screen.getByTestId('audit-miss-summary')).toBeInTheDocument();
  });
});

describe('links section (FR-062)', () => {
  it('links source, live site and asset register to the configured URLs', async () => {
    await renderServer(LinksSection({ locale: 'en' }));
    expect(screen.getByRole('link', { name: /Source code/ })).toHaveAttribute(
      'href',
      CASE_STUDY_LINKS.source,
    );
    expect(screen.getByRole('link', { name: /Live site/ })).toHaveAttribute(
      'href',
      CASE_STUDY_LINKS.live,
    );
    expect(screen.getByRole('link', { name: /Asset sources/ })).toHaveAttribute(
      'href',
      CASE_STUDY_LINKS.assets,
    );
    for (const link of screen.getAllByRole('link')) {
      expect(link).toHaveAttribute('target', '_blank');
    }
  });
});

describe.each(['en', 'th'] as const)('case-study content in %s (FR-062)', (locale) => {
  it('has only h2 and h3 headings in reading order, no h1 and no skipped level', async () => {
    await renderServer(CaseStudyContent({ locale }));
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    const t = locale === 'th' ? th.caseStudy : en.caseStudy;
    const h2 = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(h2).toEqual([
      t.intro.heading,
      t.problem.heading,
      t.constraints.heading,
      t.stack.heading,
      t.tradeoffs.heading,
      t.performance.heading,
      t.quality.heading,
      t.links.heading,
    ]);
    const levels = screen.getAllByRole('heading').map((h) => Number(h.tagName.slice(1)));
    levels.forEach((level, i) => {
      expect(level).toBeGreaterThanOrEqual(2);
      if (i > 0) expect(level - (levels[i - 1] ?? level)).toBeLessThanOrEqual(1);
    });
  });
});
