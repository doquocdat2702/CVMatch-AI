import { useEffect, useId, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { deleteUser, getUsers, resetUserPassword, updateUserStatus } from '../../api/admin.api'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import Loading from '../../components/common/Loading'
import Modal from '../../components/common/Modal'
import Pagination from '../../components/common/Pagination'
import Select from '../../components/common/Select'
import Table from '../../components/common/Table'
import { useAuth } from '../../hooks/useAuth'
import { getErrorMessage } from '../../utils/apiError'
import { formatDate } from '../../utils/format'
import { ROLES, ROLE_LABEL } from '../../utils/roles'
import { MIN_PASSWORD_LENGTH } from '../../utils/validation'
import styles from './AccountList.module.css'

// Bằng số mặc định của backend (GET /admin/users)
const PAGE_SIZE = 10

const ROLE_VALUES = Object.values(ROLES)

const ROLE_FILTER_OPTIONS = [
  { value: '', label: 'Tất cả vai trò' },
  ...ROLE_VALUES.map((role) => ({ value: role, label: ROLE_LABEL[role] })),
]

// Thao tác cần hỏi xác nhận trước khi chạy. Mở khóa không cần hỏi vì không gây mất gì.
const CONFIRM = {
  lock: {
    title: 'Khóa tài khoản',
    text: (user) =>
      `Khóa tài khoản ${user.email}? Có hiệu lực ngay: người dùng không đăng nhập và không thao tác được cho tới khi được mở khóa. Dữ liệu của tài khoản vẫn được giữ nguyên.`,
    button: 'Khóa tài khoản',
    pending: 'Đang khóa...',
    done: (user) => `Đã khóa tài khoản ${user.email}.`,
    run: (user) => updateUserStatus(user.id, false),
  },
  delete: {
    title: 'Xóa tài khoản',
    text: (user) =>
      `Xóa vĩnh viễn tài khoản ${user.email} cùng hồ sơ, CV và thông báo của tài khoản này? Thao tác này không hoàn tác được.`,
    button: 'Xóa tài khoản',
    pending: 'Đang xóa...',
    done: (user) => `Đã xóa tài khoản ${user.email}.`,
    run: (user) => deleteUser(user.id),
  },
}

const EMPTY_RESET_FORM = { newPassword: '', confirmPassword: '' }

function validateReset(form) {
  const errors = {}
  if (form.newPassword.length < MIN_PASSWORD_LENGTH) {
    errors.newPassword = `Mật khẩu mới phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự`
  }
  if (form.confirmPassword !== form.newPassword) {
    errors.confirmPassword = 'Mật khẩu xác nhận không khớp'
  }
  return errors
}

// Danh sách tài khoản của cả 3 vai trò. Vai trò, email tìm kiếm và trang nằm trên URL
// (?role=&email=&page=), tải lại trang vẫn giữ.
function AccountList() {
  const { user: currentUser } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const resetFormId = useId()

  // Giá trị sai trên URL (vd ?role=ABC, ?page=-1) thì coi như không lọc / trang 1
  const paramRole = searchParams.get('role')
  const roleFilter = ROLE_VALUES.includes(paramRole) ? paramRole : ''
  const emailFilter = (searchParams.get('email') || '').trim()
  const page = Math.max(1, Number(searchParams.get('page')) || 1)

  // Kết quả gắn với khóa của lần gọi: khóa khác khóa hiện tại nghĩa là đang tải
  const [result, setResult] = useState({ key: null, data: null, error: '' })
  const [reloadKey, setReloadKey] = useState(0)
  const requestKey = `${roleFilter}|${emailFilter}|${page}|${reloadKey}`

  // { type: 'success' | 'error', text }
  const [notice, setNotice] = useState(null)
  // Tài khoản đang mở khóa (thao tác không qua hộp xác nhận)
  const [busyId, setBusyId] = useState(null)

  // Hộp xác nhận khóa / xóa: { action: 'lock' | 'delete', user }
  const [confirm, setConfirm] = useState(null)
  const [running, setRunning] = useState(false)
  const [confirmError, setConfirmError] = useState('')

  // Hộp đặt lại mật khẩu
  const [resetTarget, setResetTarget] = useState(null)
  const [resetForm, setResetForm] = useState(EMPTY_RESET_FORM)
  const [resetErrors, setResetErrors] = useState({})
  const [resetError, setResetError] = useState('')
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    let ignore = false
    getUsers({ role: roleFilter || undefined, email: emailFilter || undefined, page, limit: PAGE_SIZE })
      .then((response) => {
        if (!ignore) setResult({ key: requestKey, data: response.data, error: '' })
      })
      .catch((err) => {
        if (!ignore) {
          setResult({ key: requestKey, data: null, error: getErrorMessage(err, 'Không tải được danh sách tài khoản') })
        }
      })
    return () => {
      ignore = true
    }
  }, [roleFilter, emailFilter, page, requestKey])

  // changes: { role, email, page } ghi đè lên giá trị hiện tại. Bỏ tham số rỗng cho URL gọn
  function buildParams(changes) {
    const next = { role: roleFilter, email: emailFilter, page: page > 1 ? String(page) : '', ...changes }
    return Object.fromEntries(Object.entries(next).filter(([, value]) => value))
  }

  // Đổi bộ lọc thì truyền page: '' để về trang 1
  function updateParams(changes) {
    setNotice(null)
    setSearchParams(buildParams(changes))
  }

  function handleSearch(event) {
    event.preventDefault()
    const email = String(new FormData(event.currentTarget).get('email') || '').trim()
    updateParams({ email, page: '' })
  }

  function handlePageChange(nextPage) {
    updateParams({ page: nextPage > 1 ? String(nextPage) : '' })
    window.scrollTo(0, 0)
  }

  // Lấy lại trang hiện tại sau mỗi thao tác (kể cả khi lỗi) để luôn khớp với backend.
  // Xóa hết tài khoản của trang cuối thì lùi về trang trước.
  async function refreshList() {
    try {
      const response = await getUsers({
        role: roleFilter || undefined,
        email: emailFilter || undefined,
        page,
        limit: PAGE_SIZE,
      })
      if (response.data.items.length === 0 && page > 1) {
        // Không qua updateParams để giữ lại thông báo "Đã xóa..."
        setSearchParams(buildParams({ page: page > 2 ? String(page - 1) : '' }))
        return
      }
      setResult({ key: requestKey, data: response.data, error: '' })
    } catch {
      // Giữ danh sách đang hiện, lần tải trang sau sẽ lấy lại
    }
  }

  // ===== Khóa, xóa (có hỏi xác nhận) và mở khóa =====

  function openConfirm(action, user) {
    setNotice(null)
    setConfirmError('')
    setConfirm({ action, user })
  }

  function closeConfirm() {
    if (!running) setConfirm(null)
  }

  async function handleConfirm() {
    const config = CONFIRM[confirm.action]
    setRunning(true)
    setConfirmError('')
    try {
      await config.run(confirm.user)
      setNotice({ type: 'success', text: config.done(confirm.user) })
      setConfirm(null)
    } catch (err) {
      // Giữ hộp, hiện đúng câu của API (vd "Tài khoản đang có 3 tin tuyển dụng, không thể xóa...")
      setConfirmError(getErrorMessage(err, 'Thao tác thất bại, vui lòng thử lại'))
      // Xóa nhà tuyển dụng / ứng viên bị 400 nghĩa là đã có dữ liệu tuyển dụng (tin hoặc đơn):
      // đánh dấu blocked để hộp đổi nút Xóa thành gợi ý khóa thay vì xóa
      const status = err.response ? err.response.status : null
      if (confirm.action === 'delete' && status === 400 && confirm.user.role !== ROLES.ADMIN) {
        setConfirm((prev) => (prev ? { ...prev, blocked: true } : prev))
      }
    } finally {
      setRunning(false)
      await refreshList()
    }
  }

  async function handleUnlock(user) {
    setNotice(null)
    setBusyId(user.id)
    try {
      await updateUserStatus(user.id, true)
      setNotice({ type: 'success', text: `Đã mở khóa tài khoản ${user.email}.` })
    } catch (err) {
      setNotice({ type: 'error', text: getErrorMessage(err, 'Mở khóa thất bại, vui lòng thử lại') })
    } finally {
      await refreshList()
      setBusyId(null)
    }
  }

  // ===== Đặt lại mật khẩu =====

  function openReset(user) {
    setNotice(null)
    setResetForm(EMPTY_RESET_FORM)
    setResetErrors({})
    setResetError('')
    setResetTarget(user)
  }

  function closeReset() {
    if (!resetting) setResetTarget(null)
  }

  function handleResetChange(event) {
    const { name, value } = event.target
    setResetForm((prev) => ({ ...prev, [name]: value }))
    setResetErrors((prev) => ({ ...prev, [name]: '' }))
  }

  async function handleResetSubmit(event) {
    event.preventDefault()
    setResetError('')

    const errors = validateReset(resetForm)
    setResetErrors(errors)
    if (Object.keys(errors).length > 0) {
      return
    }

    setResetting(true)
    try {
      await resetUserPassword(resetTarget.id, resetForm.newPassword)
      setNotice({
        type: 'success',
        text: `Đã đặt lại mật khẩu cho ${resetTarget.email}. Hãy báo mật khẩu mới cho người dùng qua kênh nội bộ và nhắc họ đổi lại trong trang Hồ sơ.`,
      })
      // Xóa trắng để mật khẩu không nằm lại trong state
      setResetForm(EMPTY_RESET_FORM)
      setResetTarget(null)
    } catch (err) {
      setResetError(getErrorMessage(err, 'Đặt lại mật khẩu thất bại, vui lòng thử lại'))
    } finally {
      setResetting(false)
    }
  }

  // ===== Bảng =====

  const actionsLocked = busyId !== null || running

  const columns = [
    {
      key: 'email',
      title: 'Tài khoản',
      render: (user) => (
        <div className={styles.account}>
          <span className={styles.email}>{user.email}</span>
          {user.fullName && <span className={styles.muted}>{user.fullName}</span>}
        </div>
      ),
    },
    { key: 'role', title: 'Vai trò', render: (user) => ROLE_LABEL[user.role] || user.role },
    {
      key: 'isActive',
      title: 'Trạng thái',
      render: (user) =>
        user.isActive ? <Badge status="ACTIVE">Đang hoạt động</Badge> : <Badge status="LOCKED">Đã khóa</Badge>,
    },
    { key: 'createdAt', title: 'Ngày tạo', render: (user) => formatDate(user.createdAt) },
    {
      key: 'actions',
      title: 'Thao tác',
      align: 'right',
      render: (user) => {
        // Backend chặn admin tự khóa, tự xóa, tự đặt lại mật khẩu: ẩn hết thao tác trên dòng của chính mình.
        // Mật khẩu của mình đổi ở trang Hồ sơ.
        if (currentUser && user.id === currentUser.id) {
          return <span className={styles.muted}>Tài khoản của bạn</span>
        }
        return (
          <div className={styles.rowActions}>
            {user.isActive ? (
              <Button variant="ghost" size="sm" onClick={() => openConfirm('lock', user)} disabled={actionsLocked}>
                Khóa
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleUnlock(user)}
                loading={busyId === user.id}
                disabled={actionsLocked}
              >
                {busyId === user.id ? 'Đang mở khóa...' : 'Mở khóa'}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => openReset(user)} disabled={actionsLocked}>
              Đặt lại mật khẩu
            </Button>
            <Button variant="ghost" size="sm" onClick={() => openConfirm('delete', user)} disabled={actionsLocked}>
              Xóa
            </Button>
          </div>
        )
      },
    },
  ]

  let list
  if (result.key !== requestKey) {
    list = <Loading text="Đang tải danh sách tài khoản..." />
  } else if (result.error) {
    list = (
      <>
        <p className={styles.alertError} role="alert">
          {result.error}
        </p>
        <Button variant="secondary" onClick={() => setReloadKey((key) => key + 1)}>
          Thử lại
        </Button>
      </>
    )
  } else if (result.data.items.length === 0 && page > 1) {
    // Số trang trên URL vượt quá số trang thật (vd ?page=99)
    list = (
      <p className={styles.emptyText}>
        Trang này không có tài khoản nào.{' '}
        <Button variant="ghost" size="sm" onClick={() => handlePageChange(1)}>
          Về trang đầu
        </Button>
      </p>
    )
  } else {
    const filtered = roleFilter || emailFilter
    list = (
      <>
        {/* Không có kết quả thì bảng đã báo, không cần dòng đếm */}
        {result.data.pagination.total > 0 && (
          <p className={styles.summary}>
            {filtered ? 'Tìm thấy' : 'Tổng cộng'} {result.data.pagination.total} tài khoản.
          </p>
        )}
        <Table
          columns={columns}
          data={result.data.items}
          emptyText={filtered ? 'Không có tài khoản nào khớp bộ lọc.' : 'Chưa có tài khoản nào.'}
        />
        <p className={styles.note}>
          Tài khoản nhà tuyển dụng đã đăng tin hoặc ứng viên đã nộp đơn không xóa được, chỉ khóa được.
        </p>
        <div className={styles.pagination}>
          <Pagination page={page} totalPages={result.data.pagination.totalPages} onChange={handlePageChange} />
        </div>
      </>
    )
  }

  const confirmConfig = confirm ? CONFIRM[confirm.action] : null

  return (
    <>
      <div className={styles.pageHeader}>
        <h1>Tài khoản</h1>
        <Link className={styles.primaryLink} to="/admin/recruiters/new">
          Tạo tài khoản Recruiter
        </Link>
      </div>
      <p className={styles.intro}>
        Tài khoản của quản trị viên, nhà tuyển dụng và ứng viên. Khóa có hiệu lực ngay, mở khóa lại được bất cứ lúc
        nào.
      </p>

      {/* key theo email trên URL: bấm Back / Forward thì ô tìm kiếm hiện lại đúng email đang lọc */}
      <form key={emailFilter} className={styles.filters} onSubmit={handleSearch} role="search">
        <Select
          label="Vai trò"
          name="role"
          options={ROLE_FILTER_OPTIONS}
          value={roleFilter}
          onChange={(event) => updateParams({ role: event.target.value, page: '' })}
        />
        <Input
          label="Tìm theo email"
          name="email"
          type="search"
          defaultValue={emailFilter}
          placeholder="Nhập một phần email"
          maxLength={191}
        />
        <div className={styles.filterActions}>
          <Button type="submit" variant="secondary">
            Tìm
          </Button>
          {emailFilter && (
            <Button variant="ghost" onClick={() => updateParams({ email: '', page: '' })}>
              Bỏ tìm kiếm
            </Button>
          )}
        </div>
      </form>

      {notice && (
        <p
          className={notice.type === 'error' ? styles.alertError : styles.alertSuccess}
          role={notice.type === 'error' ? 'alert' : 'status'}
        >
          {notice.text}
        </p>
      )}

      {list}

      <Modal
        open={confirm !== null}
        onClose={closeConfirm}
        title={confirmConfig ? confirmConfig.title : ''}
        footer={
          <>
            <Button variant="secondary" onClick={closeConfirm} disabled={running}>
              {confirm && confirm.blocked ? 'Đóng' : 'Hủy'}
            </Button>
            {confirm && confirm.blocked ? (
              // Không xóa được: gợi ý khóa. Bấm thì chuyển sang hộp xác nhận khóa, không khóa ngay
              confirm.user.isActive && (
                <Button variant="danger" onClick={() => openConfirm('lock', confirm.user)}>
                  Khóa tài khoản thay vì xóa
                </Button>
              )
            ) : (
              <Button variant="danger" onClick={handleConfirm} loading={running}>
                {running ? confirmConfig && confirmConfig.pending : confirmConfig && confirmConfig.button}
              </Button>
            )}
          </>
        }
      >
        <p className={styles.modalText}>{confirmConfig ? confirmConfig.text(confirm.user) : ''}</p>
        {confirmError && (
          <p className={`${styles.alertError} ${styles.modalAlert}`} role="alert">
            {confirmError}
          </p>
        )}
        {confirm && confirm.blocked && !confirm.user.isActive && (
          <p className={styles.modalHint}>
            Tài khoản này đang bị khóa sẵn: người dùng không đăng nhập được, dữ liệu tuyển dụng vẫn được giữ.
          </p>
        )}
      </Modal>

      <Modal
        open={resetTarget !== null}
        onClose={closeReset}
        title="Đặt lại mật khẩu"
        footer={
          <>
            <Button variant="secondary" onClick={closeReset} disabled={resetting}>
              Hủy
            </Button>
            {/* Nút nằm ở chân modal, ngoài thẻ form: gắn vào form bằng thuộc tính form */}
            <Button type="submit" form={resetFormId} loading={resetting}>
              {resetting ? 'Đang lưu...' : 'Đặt lại mật khẩu'}
            </Button>
          </>
        }
      >
        {resetTarget && (
          <form id={resetFormId} className={styles.modalForm} onSubmit={handleResetSubmit} noValidate>
            <p className={styles.modalText}>
              Đặt mật khẩu mới cho <strong>{resetTarget.email}</strong>. Mật khẩu cũ hết hiệu lực ngay.
            </p>
            {resetError && (
              <p className={styles.alertError} role="alert">
                {resetError}
              </p>
            )}
            <Input
              label="Mật khẩu mới"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
              hint={`Ít nhất ${MIN_PASSWORD_LENGTH} ký tự`}
              value={resetForm.newPassword}
              onChange={handleResetChange}
              error={resetErrors.newPassword}
              disabled={resetting}
            />
            <Input
              label="Xác nhận mật khẩu mới"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={resetForm.confirmPassword}
              onChange={handleResetChange}
              error={resetErrors.confirmPassword}
              disabled={resetting}
            />
          </form>
        )}
      </Modal>
    </>
  )
}

export default AccountList
