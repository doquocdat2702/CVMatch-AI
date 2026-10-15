import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getMyJobs } from '../../api/job.api'
import { getRecommendedCandidates } from '../../api/matching.api'
import Button from '../../components/common/Button'
import Loading from '../../components/common/Loading'
import Select from '../../components/common/Select'
import Table from '../../components/common/Table'
import CandidateMatrixModal from '../../components/matching/CandidateMatrixModal'
import { getErrorMessage } from '../../utils/apiError'
import { formatNumber } from '../../utils/format'
import styles from './RecommendedCandidates.module.css'

// "x/y yêu cầu có bằng chứng (z%)"
function formatCoverage(supported, total, coverage) {
  if (!total) return 'Tin chưa có yêu cầu để đối chiếu'
  return `${supported}/${total} yêu cầu có bằng chứng (${formatNumber(coverage)}%)`
}

function jobOptionLabel(job) {
  return job.isOpen ? job.title : `${job.title} (đã đóng)`
}

// Ứng viên gợi ý cho một tin của chính nhà tuyển dụng này.
// Tin đang chọn nằm trên URL (?jobId=), tải lại trang vẫn giữ; không có thì lấy tin đầu danh sách.
function RecommendedCandidates() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [jobs, setJobs] = useState(null)
  const [jobsLoading, setJobsLoading] = useState(true)
  const [jobsError, setJobsError] = useState('')
  const [jobsReloadKey, setJobsReloadKey] = useState(0)

  // Kết quả gắn với khóa của lần gọi (tin + lần thử lại): khóa khác khóa hiện tại nghĩa là đang tải
  const [result, setResult] = useState({ key: null, data: null, error: '' })
  const [reloadKey, setReloadKey] = useState(0)

  const [matrixTarget, setMatrixTarget] = useState(null)

  useEffect(() => {
    let ignore = false
    getMyJobs()
      .then((response) => {
        if (!ignore) setJobs(response.data)
      })
      .catch((err) => {
        if (!ignore) setJobsError(getErrorMessage(err, 'Không tải được danh sách tin tuyển dụng'))
      })
      .finally(() => {
        if (!ignore) setJobsLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [jobsReloadKey])

  // jobId trên URL phải là tin của mình, không thì dùng tin đầu tiên
  const paramJobId = searchParams.get('jobId')
  const selectedJob = jobs ? jobs.find((job) => String(job.id) === paramJobId) || jobs[0] || null : null
  const jobId = selectedJob ? String(selectedJob.id) : ''
  const requestKey = jobId ? `${jobId}:${reloadKey}` : null

  useEffect(() => {
    if (!requestKey) return undefined
    let ignore = false
    getRecommendedCandidates(jobId)
      .then((response) => {
        if (!ignore) setResult({ key: requestKey, data: response.data, error: '' })
      })
      .catch((err) => {
        if (!ignore) {
          setResult({ key: requestKey, data: null, error: getErrorMessage(err, 'Không tải được ứng viên gợi ý') })
        }
      })
    return () => {
      ignore = true
    }
  }, [jobId, requestKey])

  function handleJobsRetry() {
    setJobsError('')
    setJobsLoading(true)
    setJobsReloadKey((key) => key + 1)
  }

  function handleJobChange(event) {
    setSearchParams({ jobId: event.target.value }, { replace: true })
  }

  const columns = [
    {
      key: 'candidate',
      title: 'Ứng viên',
      render: (item) => <span className={styles.name}>{item.candidate.fullName || 'Chưa có họ tên'}</span>,
    },
    {
      key: 'coverage',
      title: 'Coverage',
      render: (item) => formatCoverage(item.supported, item.total, item.coverage),
    },
    {
      key: 'actions',
      title: 'Thao tác',
      align: 'right',
      render: (item) => (
        <Button variant="ghost" size="sm" onClick={() => setMatrixTarget(item.candidate)}>
          Xem ma trận
        </Button>
      ),
    },
  ]

  let content
  if (jobsLoading) {
    content = <Loading text="Đang tải tin tuyển dụng..." />
  } else if (jobsError) {
    content = (
      <>
        <p className={styles.alertError} role="alert">
          {jobsError}
        </p>
        <Button variant="secondary" onClick={handleJobsRetry}>
          Thử lại
        </Button>
      </>
    )
  } else if (jobs.length === 0) {
    content = (
      <div className={styles.empty}>
        <p className={styles.emptyText}>Bạn chưa đăng tin tuyển dụng nào.</p>
        <Link className={styles.link} to="/recruiter/jobs/new">
          Đăng tin tuyển dụng
        </Link>
      </div>
    )
  } else {
    let candidates
    if (result.key !== requestKey) {
      candidates = <Loading text="Đang đối chiếu ứng viên..." />
    } else if (result.error) {
      candidates = (
        <>
          <p className={styles.alertError} role="alert">
            {result.error}
          </p>
          <Button variant="secondary" onClick={() => setReloadKey((key) => key + 1)}>
            Thử lại
          </Button>
        </>
      )
    } else if (result.data.message) {
      // Tin chưa có yêu cầu nào: chưa có gì để đối chiếu
      candidates = (
        <div className={styles.empty}>
          <p className={styles.emptyText}>{result.data.message}.</p>
          <Link className={styles.link} to={`/recruiter/jobs/${jobId}/requirements`}>
            Phân tích JD hoặc thêm yêu cầu
          </Link>
        </div>
      )
    } else {
      // Mỗi ứng viên một hàng: dùng mã hồ sơ ứng viên làm key của hàng
      const rows = result.data.items.map((item) => ({ ...item, id: item.candidate.id }))
      candidates = (
        <>
          <Table
            columns={columns}
            data={rows}
            emptyText="Chưa có ứng viên nào có CV đã phân tích xong."
          />
          {/* Coverage chỉ là chỉ số đối chiếu, luôn kèm câu nhắc của API */}
          {result.data.note && <p className={styles.note}>{result.data.note}</p>}
        </>
      )
    }

    content = (
      <>
        <div className={styles.filter}>
          <Select
            label="Tin tuyển dụng"
            name="jobId"
            options={jobs.map((job) => ({ value: String(job.id), label: jobOptionLabel(job) }))}
            value={jobId}
            onChange={handleJobChange}
          />
        </div>
        {candidates}
      </>
    )
  }

  return (
    <>
      <h1>Ứng viên gợi ý</h1>
      <p className={styles.intro}>
        Ứng viên đã có CV phân tích xong, sắp theo số yêu cầu của tin có bằng chứng trong hồ sơ (tối đa 10 người). Danh
        sách chỉ hỗ trợ đối chiếu, không phải xếp hạng năng lực; quyết định tuyển dụng do bạn đưa ra.
      </p>

      {content}

      {matrixTarget && (
        <CandidateMatrixModal
          title={`Đối chiếu: ${matrixTarget.fullName || 'Ứng viên'} - ${selectedJob ? selectedJob.title : ''}`}
          jobId={jobId}
          candidateId={matrixTarget.id}
          onClose={() => setMatrixTarget(null)}
        />
      )}
    </>
  )
}

export default RecommendedCandidates
