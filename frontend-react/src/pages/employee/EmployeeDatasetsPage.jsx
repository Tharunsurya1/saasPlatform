import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  FileText,
  Eye,
  BarChart3,
  X,
  Sparkles,
  Plus,
  Database,
  Loader
} from 'lucide-react';

import {
  getDatasets,
  getDatasetPreview,
  getAvailableDatasetsToRequest,
  requestPermission
} from '../../services/api';

import EmployeeLayout from '../../layout/EmployeeLayout';

const MOCK_DATASETS = [
  {
    id: 'ds-001',
    name: 'Customer_Data',
    type: 'xlsx',
    status: 'cleaned',
    rows: 12450,
    cols: 24,
    size: '8.1 MB',
    version: 'v3',
    updated: '2 days ago',
    uploadedBy: 'John Admin'
  },
  {
    id: 'ds-002',
    name: 'Q3_Sales_Report',
    type: 'csv',
    status: 'cleaning',
    rows: 4521,
    cols: 12,
    size: '2.4 MB',
    version: 'v1',
    updated: '12 min ago',
    uploadedBy: 'Sarah Manager'
  },
  {
    id: 'ds-003',
    name: 'Finance_Q2_2024',
    type: 'xlsx',
    status: 'not_cleaned',
    rows: 3200,
    cols: 9,
    size: '1.8 MB',
    version: 'v1',
    updated: '5 days ago',
    uploadedBy: 'John Admin'
  }
];

const typeIcons = {
  csv: '📄',
  xlsx: '📊',
  json: '🗂'
};

const typeColors = {
  csv: { bg: 'rgba(63,185,80,0.1)' },
  xlsx: { bg: 'rgba(88,166,255,0.1)' },
  json: { bg: 'rgba(210,153,34,0.1)' }
};

const StatusBadge = ({ status }) => {
  const config = {
    cleaned: {
      bg: 'rgba(63,185,80,0.1)',
      color: '#3fb950',
      label: '● Cleaned'
    },
    cleaning: {
      bg: 'rgba(210,153,34,0.1)',
      color: '#d29922',
      label: '⟳ Cleaning'
    },
    not_cleaned: {
      bg: 'rgba(139,148,158,0.1)',
      color: '#8b949e',
      label: '○ Not Cleaned'
    }
  };

  const item = config[status] || config.not_cleaned;

  return (
    <span
      className="emp-status-badge"
      style={{
        background: item.bg,
        color: item.color
      }}
    >
      {item.label}
    </span>
  );
};

const EmployeeDatasetsPage = () => {
  const navigate = useNavigate();

  const [datasets, setDatasets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [previewModal, setPreviewModal] = useState(null);

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [availableDatasets, setAvailableDatasets] = useState([]);
  const [isLoadingAvailable, setIsLoadingAvailable] = useState(false);
  const [requestSearchQuery, setRequestSearchQuery] = useState('');
  const [requestStatus, setRequestStatus] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getDatasets();

        if (res.success && res.data?.length > 0) {
          const mapped = res.data.map((d, i) => ({
            id: d.dataset_id || d._id || `ds-${i}`,
            dataset_id: d.dataset_id || d._id,
            name:
              d.name ||
              d.dataset_name ||
              d.filename?.replace(/\.\w+$/, '') ||
              `Dataset ${i + 1}`,
            type:
              d.filename?.split('.').pop() ||
              d.name?.split('.').pop() ||
              'csv',
            status: d.status || 'not_cleaned',
            rows: d.rows_count || d.rows,
            cols: d.columns_count || d.columns,
            size: d.fileSize
              ? `${(d.fileSize / 1024 / 1024).toFixed(1)} MB`
              : '—',
            version: 'v1',
            updated: 'recent',
            uploadedBy:
              d.uploaded_by_name ||
              d.uploaded_by_email ||
              'Admin'
          }));

          setDatasets(mapped);
        } else {
          setDatasets(MOCK_DATASETS);
        }
      } catch (error) {
        setDatasets(MOCK_DATASETS);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const fetchAvailable = async () => {
    setIsLoadingAvailable(true);

    try {
      const res = await getAvailableDatasetsToRequest();

      if (res.success) {
        setAvailableDatasets(res.data || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingAvailable(false);
    }
  };

  const handleRequestAccess = async (dsId) => {
    setRequestStatus((prev) => ({
      ...prev,
      [dsId]: 'sending'
    }));

    try {
      const res = await requestPermission(dsId, 'DATASET_ACCESS');

      if (res.success) {
        setRequestStatus((prev) => ({
          ...prev,
          [dsId]: 'sent'
        }));
      } else {
        setRequestStatus((prev) => ({
          ...prev,
          [dsId]: 'error'
        }));
      }
    } catch {
      setRequestStatus((prev) => ({
        ...prev,
        [dsId]: 'error'
      }));
    }
  };

  const openPreview = async (ds) => {
    const dsId = ds.dataset_id || ds.id;

    setPreviewModal({
      name: ds.name,
      rows: ds.rows,
      totalRows: 0,
      loading: true,
      headers: [],
      data: []
    });

    try {
      const res = await getDatasetPreview(dsId);

      if (res.success) {
        setPreviewModal({
          name: ds.name,
          rows: res.data?.length || 0,
          totalRows: res.totalRows || 0,
          loading: false,
          headers:
            res.data?.length > 0
              ? Object.keys(res.data[0])
              : [],
          data: res.data || []
        });
      }
    } catch {
      setPreviewModal({
        name: ds.name,
        rows: 0,
        totalRows: 0,
        loading: false,
        headers: [],
        data: []
      });
    }
  };

  const filtered = datasets.filter((ds) => {
    const matchesSearch = ds.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    const matchesType =
      typeFilter === 'all' || ds.type === typeFilter;

    const matchesStatus =
      statusFilter === 'all' || ds.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <EmployeeLayout>
      <div className="emp-topbar">
        <div>
          <div className="emp-topbar-title">
            Company Datasets
          </div>
          <div className="emp-topbar-sub">
            Manage and explore your data assets
          </div>
        </div>

        <div className="emp-topbar-actions">
          <div className="emp-search-bar">
            <Search size={14} />
            <input
              type="text"
              placeholder="Search datasets..."
              value={searchQuery}
              onChange={(e) =>
                setSearchQuery(e.target.value)
              }
            />
          </div>

          <button
            className="emp-btn emp-btn-primary"
            onClick={() => {
              setShowRequestModal(true);
              fetchAvailable();
            }}
          >
            <Plus size={14} />
            Request New Dataset
          </button>
        </div>
      </div>

      <div className="emp-content">
        <div className="emp-filters">
          <select
            className="emp-filter-select"
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(e.target.value)
            }
          >
            <option value="all">All Types</option>
            <option value="csv">CSV</option>
            <option value="xlsx">Excel</option>
            <option value="json">JSON</option>
          </select>

          <select
            className="emp-filter-select"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value)
            }
          >
            <option value="all">All Status</option>
            <option value="cleaned">Cleaned</option>
            <option value="cleaning">Cleaning</option>
            <option value="not_cleaned">
              Not Cleaned
            </option>
          </select>
        </div>

        <div className="emp-dataset-grid">
          {isLoading ? (
            <div>Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="emp-empty">
              <FileText size={48} />
              <div>No datasets found</div>
            </div>
          ) : (
            filtered.map((ds) => (
              <div
                key={ds.id}
                className="glass-panel"
                style={{ padding: 20 }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      gap: 12
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background:
                          typeColors[ds.type]?.bg
                      }}
                    >
                      {typeIcons[ds.type]}
                    </div>

                    <div>
                      <div>{ds.name}</div>
                      <div>
                        {ds.type.toUpperCase()} ·{' '}
                        {ds.version}
                      </div>
                    </div>
                  </div>

                  <StatusBadge
                    status={ds.status}
                  />
                </div>

                <div
                  style={{
                    marginTop: 15,
                    display: 'flex',
                    gap: 15
                  }}
                >
                  <button
                    className="emp-btn emp-btn-ghost"
                    onClick={() =>
                      openPreview(ds)
                    }
                  >
                    <Eye size={12} />
                    Preview
                  </button>

                  <button
                    className="emp-btn emp-btn-ghost"
                    onClick={() =>
                      navigate(
                        `/employee/visualization?ds=${ds.id}`
                      )
                    }
                  >
                    <BarChart3 size={12} />
                    Visualize
                  </button>

                  <button
                    className="emp-btn emp-btn-primary"
                    onClick={() =>
                      navigate(
                        `/employee/cleaning?ds=${ds.id}`
                      )
                    }
                  >
                    <Sparkles size={12} />
                    Clean
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* PREVIEW MODAL */}
        {previewModal && (
          <div className="emp-modal-overlay">
            <div className="glass-panel emp-modal">
              <div className="emp-modal-header">
                <div>
                  <div className="emp-modal-title">
                    {previewModal.name}
                  </div>
                  <div className="emp-modal-subtitle">
                    First {previewModal.rows} rows • Read-only • Total: {previewModal.totalRows?.toLocaleString() || '—'} rows
                  </div>
                </div>

                <button
                  className="emp-btn"
                  onClick={() =>
                    setPreviewModal(null)
                  }
                >
                  <X size={14} />
                </button>
              </div>

              <div className="emp-modal-body">
                {previewModal.loading ? (
                  <div>Loading...</div>
                ) : (
                  <table className="emp-data-table">
                    <thead>
                      <tr>
                        <th style={{ width: 50 }}>#</th>
                        {previewModal.headers.map(
                          (h, i) => (
                            <th key={i}>{h}</th>
                          )
                        )}
                      </tr>
                    </thead>

                    <tbody>
                      {previewModal.data.map(
                        (row, ri) => (
                          <tr key={ri}>
                            <td style={{ color: 'var(--text-muted)', fontFamily: "'DM Mono', monospace" }}>{ri + 1}</td>
                            {previewModal.headers.map(
                              (h, ci) => (
                                <td key={ci}>
                                  {row[h]}
                                </td>
                              )
                            )}
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* REQUEST MODAL */}
        {showRequestModal && (
          <div className="emp-modal-overlay">
            <div className="glass-panel emp-modal">
              <div className="emp-modal-header">
                <div className="emp-modal-title">
                  Request Dataset Access
                </div>

                <button
                  className="emp-btn"
                  onClick={() =>
                    setShowRequestModal(false)
                  }
                >
                  <X size={14} />
                </button>
              </div>

              <div className="emp-modal-body">
                <input
                  type="text"
                  placeholder="Search dataset..."
                  value={requestSearchQuery}
                  onChange={(e) =>
                    setRequestSearchQuery(
                      e.target.value
                    )
                  }
                />

                {isLoadingAvailable ? (
                  <div>
                    <Loader
                      size={20}
                      className="spin"
                    />
                  </div>
                ) : (
                  availableDatasets
                    .filter((ds) =>
                      ds.name
                        ?.toLowerCase()
                        .includes(
                          requestSearchQuery.toLowerCase()
                        )
                    )
                    .map((ds) => {
                      const dsId =
                        ds.dataset_id || ds.id;

                      const status =
                        requestStatus[dsId];

                      return (
                        <div
                          key={dsId}
                          style={{
                            marginTop: 10
                          }}
                        >
                          <span>{ds.name}</span>

                          <button
                            className="emp-btn emp-btn-primary"
                            disabled={
                              status ===
                              'sending' ||
                              status === 'sent'
                            }
                            onClick={() =>
                              handleRequestAccess(
                                dsId
                              )
                            }
                          >
                            {status ===
                              'sending'
                              ? 'Sending...'
                              : status ===
                                'sent'
                                ? 'Sent'
                                : 'Request'}
                          </button>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </EmployeeLayout>
  );
};

export default EmployeeDatasetsPage;