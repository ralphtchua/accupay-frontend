import { useEffect, useMemo, useState } from 'react';
import {
  getApprovers, createApprover, updateApprover, deleteApprover, getApproverEmployees,
  type ApproverRecord, type ApproverInput,
} from '@/services/ApproverDirectoryService';
import { Card } from '@/components/ui';
import { PageIntro, Table, Td, EmptyState, SearchBox } from '@/components/page';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Field, TextInput } from '@/components/form';
import { useToast } from '@/components/Toast';
import { isValidEmail } from '@/lib/validation';

/* =====================================================================
   Approvers — the org's master approver directory (real /api/approvers).
   List with search, plus add / edit / delete. Approvers created here are
   the ones that can be assigned to employees.
   ===================================================================== */

const BLANK: ApproverInput = { firstName: '', lastName: '', emailAddress: '', companyName: '' };

export function ApproversPage() {
  const { notify } = useToast();
  const [rows, setRows] = useState<ApproverRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<ApproverRecord | 'new' | null>(null);
  const [draft, setDraft] = useState<ApproverInput>(BLANK);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<ApproverRecord | null>(null);
  const [viewing, setViewing] = useState<ApproverRecord | null>(null);
  const [viewNames, setViewNames] = useState<string[] | null>(null);

  async function openEmployees(a: ApproverRecord) {
    setViewing(a);
    setViewNames(null);
    try {
      setViewNames(await getApproverEmployees(a.id));
    } catch {
      setViewNames([]);
    }
  }

  async function load() {
    setLoading(true);
    try {
      setRows(await getApprovers());
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((a) =>
      [a.firstName, a.lastName, a.emailAddress, a.companyName]
        .some((v) => (v ?? '').toLowerCase().includes(q)),
    );
  }, [rows, query]);

  function openNew() { setDraft(BLANK); setEditing('new'); }
  function openEdit(a: ApproverRecord) {
    setDraft({ firstName: a.firstName, lastName: a.lastName, emailAddress: a.emailAddress, companyName: a.companyName });
    setEditing(a);
  }

  const canSave =
    draft.firstName.trim() !== '' &&
    draft.lastName.trim() !== '' &&
    isValidEmail(draft.emailAddress.trim());

  async function save() {
    if (!canSave || !editing) return;
    setSaving(true);
    const payload: ApproverInput = {
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      emailAddress: draft.emailAddress.trim(),
      companyName: draft.companyName.trim(),
    };
    try {
      if (editing === 'new') {
        await createApprover(payload);
        notify('Approver added');
      } else {
        await updateApprover(editing.id, payload);
        notify('Approver updated');
      }
      setEditing(null);
      load();
    } catch (e) {
      notify((e as Error).message || 'Could not save the approver.');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    try {
      await deleteApprover(toDelete.id);
      notify('Approver deleted');
      setToDelete(null);
      load();
    } catch (e) {
      notify((e as Error).message || 'Could not delete the approver.');
      setToDelete(null);
    }
  }

  return (
    <div style={{ maxWidth: 940 }}>
      <PageIntro
        title="Approvers"
        subtitle="People who can approve or reject filings. Add them here, then assign them to employees."
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <SearchBox value={query} onChange={setQuery} placeholder="Search approvers" width={220} />
            <button className="ao-btn ao-btn--primary" style={{ height: 38, padding: '0 16px', color: '#fff', whiteSpace: 'nowrap' }} onClick={openNew}>
              Add approver
            </button>
          </div>
        }
      />

      <Card style={{ overflow: 'hidden' }}>
        {loading ? (
          <EmptyState message="Loading approvers…" />
        ) : rows.length === 0 ? (
          <EmptyState message="No approvers yet. Add one to get started." />
        ) : shown.length === 0 ? (
          <EmptyState message="No approvers match your search." />
        ) : (
          <Table head={['Email', 'First name', 'Last name', 'Company', '']}>
            {shown.map((a) => (
              <tr key={a.id}>
                <Td style={{ fontWeight: 600, color: 'var(--ao-text)' }}>{a.emailAddress || '—'}</Td>
                <Td>{a.firstName || '—'}</Td>
                <Td>{a.lastName || '—'}</Td>
                <Td>{a.companyName || '—'}</Td>
                <Td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button className="ao-btn ao-btn--ghost" style={{ height: 32, padding: '0 12px', marginRight: 8 }} onClick={() => openEmployees(a)}>Employees</button>
                  <button className="ao-btn ao-btn--ghost" style={{ height: 32, padding: '0 12px', marginRight: 8 }} onClick={() => openEdit(a)}>Edit</button>
                  <button
                    className="ao-btn ao-btn--ghost"
                    style={{ height: 32, padding: '0 12px', color: 'var(--ao-danger)' }}
                    onClick={() => setToDelete(a)}
                  >
                    Delete
                  </button>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <ConfirmModal
        open={editing != null}
        title={editing === 'new' ? 'Add approver' : 'Edit approver'}
        width={440}
        confirmLabel={editing === 'new' ? 'Add approver' : 'Save changes'}
        confirmDisabled={!canSave || saving}
        onCancel={() => setEditing(null)}
        onConfirm={save}
        body={
          <div style={{ marginTop: 4 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <Field label="First name"><TextInput value={draft.firstName} onChange={(e) => setDraft({ ...draft, firstName: e.target.value })} /></Field>
              </div>
              <div style={{ flex: 1 }}>
                <Field label="Last name"><TextInput value={draft.lastName} onChange={(e) => setDraft({ ...draft, lastName: e.target.value })} /></Field>
              </div>
            </div>
            <Field label="Email"><TextInput type="email" value={draft.emailAddress} onChange={(e) => setDraft({ ...draft, emailAddress: e.target.value })} /></Field>
            <Field label="Company"><TextInput value={draft.companyName} onChange={(e) => setDraft({ ...draft, companyName: e.target.value })} /></Field>
          </div>
        }
      />

      <ConfirmModal
        open={toDelete != null}
        title="Delete approver?"
        confirmLabel="Delete"
        confirmVariant="danger"
        onCancel={() => setToDelete(null)}
        onConfirm={confirmDelete}
        body={
          toDelete
            ? `Remove ${toDelete.firstName} ${toDelete.lastName} (${toDelete.emailAddress})? They will be unassigned from every employee that has them.`
            : ''
        }
      />

      {viewing && (
        <div className="ao-modal-backdrop" onClick={() => setViewing(null)}>
          <div className="ao-modal" style={{ width: 440 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ font: '700 17px var(--ao-font)', marginBottom: 2 }}>
              Employees assigned to {viewing.firstName} {viewing.lastName}
            </div>
            <div style={{ font: '400 12.5px var(--ao-font)', color: 'var(--ao-muted)', marginBottom: 16 }}>
              {viewing.emailAddress}
            </div>

            {viewNames == null ? (
              <div style={{ font: '400 13px var(--ao-font)', color: 'var(--ao-muted)', padding: '8px 0' }}>Loading…</div>
            ) : viewNames.length === 0 ? (
              <div style={{ font: '400 13px var(--ao-font)', color: 'var(--ao-muted)', padding: '8px 0' }}>
                This approver isn't assigned to any employees yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
                {viewNames.map((n, i) => (
                  <div key={`${n}-${i}`} style={{ font: '500 13px var(--ao-font)', color: 'var(--ao-text-2)', padding: '8px 12px', background: 'var(--ao-surface-muted)', border: '1px solid var(--ao-border)', borderRadius: 8 }}>
                    {n}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="ao-btn ao-btn--primary" style={{ height: 40, padding: '0 18px', color: '#fff' }} onClick={() => setViewing(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
