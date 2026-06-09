interface StatusBadgeProps {
  status:
    | 'draft'
    | 'submitted'
    | 'under-review'
    | 'admin-review'
    | 'admin-approved'
    | 'researcher-approval'
    | 'agreement-generated'
    | 'signed-submitted'
    | 'commercialized'
    | 'signed'
    | 'approved'
    | 'published'
    | 'rejected'
    | 'pending'
    | 'scheduled'
    | 'completed'
    | 'cancelled'
    | 'active';
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  // `tone` maps to override-proof semantic pill classes defined in globals.css.
  // Labels are unchanged.
  const statusConfig = {
    draft: { tone: 'badge-neutral', label: 'Draft' },
    submitted: { tone: 'badge-info', label: 'Submitted' },
    'under-review': { tone: 'badge-warning', label: 'Under Review' },
    'admin-review': { tone: 'badge-warning', label: 'Admin Review' },
    'admin-approved': { tone: 'badge-info', label: 'Admin Approved' },
    'researcher-approval': { tone: 'badge-info', label: 'Researcher Approval' },
    'agreement-generated': { tone: 'badge-info', label: 'Agreement Generated' },
    'signed-submitted': { tone: 'badge-info', label: 'Signed Submitted' },
    signed: { tone: 'badge-success', label: 'Signed' },
    commercialized: { tone: 'badge-success', label: 'Commercialized' },
    approved: { tone: 'badge-success', label: 'Approved' },
    published: { tone: 'badge-success', label: 'Published' },
    rejected: { tone: 'badge-danger', label: 'Rejected' },
    pending: { tone: 'badge-warning', label: 'Pending' },
    scheduled: { tone: 'badge-info', label: 'Scheduled' },
    completed: { tone: 'badge-success', label: 'Completed' },
    cancelled: { tone: 'badge-danger', label: 'Cancelled' },
    active: { tone: 'badge-success', label: 'Active' },
  };

  const config = statusConfig[status];

  return (
    <span className={`badge-pill ${config.tone} ${className}`}>
      <span className="badge-dot" />
      {config.label}
    </span>
  );
}
