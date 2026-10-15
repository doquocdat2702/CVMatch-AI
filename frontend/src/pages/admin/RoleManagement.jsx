import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getUsers, updateUserRole } from '../../api/admin.api'
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
import { ROLES, ROLE_LABEL } from '../../utils/roles'
import styles from './RoleManagement.module.css'

const PAGE_SIZE = 10

const ROLE_VALUES = Object.values(ROLES)

const ROLE_FILTER_OPTIONS = [
  { value: '', label: 'Tất cả vai trò' },
  ...ROLE_VALUES.map((role) => ({ value: role, label: ROLE_LABEL[role] })),
]

// Backend không cho nâng tài khoản lên ADMIN: chỉ đổi sang 2 vai trò này
const ASSIGNABLE_ROLES = [ROLES.RECRUITER, ROLES.CANDIDATE]

function roleLabel(role) {
  return ROLE_LABEL[role] || role
}

// Phân quyền: chọn tài khoản trong bảng, chọn vai trò mới, xác nhận rồi mới lưu.
// Vai trò lọc, email tìm kiếm và trang nằm trên URL (?role=&email=&page=) như trang Tài khoản.
function RoleManagement() {
  const { user: currentUser } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

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
  // Chờ xác nhận: { user, role } với role là vai trò mới
  const [confirm, setConfirm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirmError, setConfirmError] = useState('')

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

  // changes: { role, email, page } ghi đè lên giá trị hiện tại; đổi bộ lọc thì truyền page: '' để về trang 1
  function updateParams(changes) {
    const next = { role: roleFilter, email: emailFilter, page: page > 1 ? String(page) : '', ...changes }
    setNotice(null)
    setSearchParams(Object.fromEntries(Object.entries(next).filter(([, value]) => value)))
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

  // Lấy lại trang hiện tại sau khi đổi (kể cả khi lỗi) để luôn khớp với backend.
  // Đang lọc theo vai trò cũ thì tài khoản vừa đổi sẽ rời khỏi danh sách, đó là đúng.
  async function refreshList() {
    try {
      const response = await getUsers({
        role: roleFilter || undefined,
        email: emailFilter || undefined,
        page,
        limit: PAGE_SIZE,
      })
      setResult({ key: requestKey, data: response.data, error: '' })
    } catch {
      // Giữ danh sách đang hiện, lần tải trang sau sẽ lấy lại
    }
  }

  function handleRoleSelect(user, role) {
    if (!role) return
    setNotice(null)
    setConfirmError('')
    setConfirm({ user, role })
  }

  function closeConfirm() {
    if (!saving) setConfirm(null)
  }

  async function handleSave() {
    const { user, role } = confirm
    setSaving(true)
    setConfirmError('')
    try {
      const response = await updateUserRole(user.id, role)
      setNotice({
        type: 'success',
        text: `Đã đổi vai trò của ${user.email} từ "${roleLabel(response.data.previousRole)}" sang "${roleLabel(response.data.role)}".`,
      })
      setConfirm(null)
    } catch (err) {
      // Vd tài khoản vừa được đổi ở nơi khác nên đã có vai trò này: giữ hộp, hiện câu của API
      setConfirmError(getErrorMessage(err, 'Đổi vai trò thất bại, vui lòng thử lại'))
    } finally {
      setSaving(false)
      await refreshList()
    }
  }

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
    {
      key: 'role',
      title: 'Vai trò hiện tại',
      render: (user) => (
        <div className={styles.roleCell}>
          <span>{roleLabel(user.role)}</span>
          {/* Tài khoản bị khóa vẫn đổi được vai trò, chỉ nhắc để admin biết */}
          {!user.isActive && <Badge status="LOCKED">Đã khóa</Badge>}
        </div>
      ),
    },
    {
      key: 'changeRole',
      title: 'Đổi vai trò',
      render: (user) => {
        // Backend chặn admin tự đổi vai trò của chính mình
        if (currentUser && user.id === currentUser.id) {
          return <span className={styles.muted}>Không đổi được vai trò của chính mình</span>
        }
        // value luôn rỗng: vai trò thật ở cột bên cạnh, ô chọn chỉ để chọn vai trò mới rồi hỏi xác nhận
        return (
          <Select
            aria-label={`Đổi vai trò của ${user.email}`}
            placeholder="Đổi sang..."
            options={ASSIGNABLE_ROLES.filter((role) => role !== user.role).map((role) => ({
              value: role,
              label: roleLabel(role),
            }))}
            value=""
            onChange={(event) => handleRoleSelect(user, event.target.value)}
            disabled={saving}
            className={styles.roleSelect}
          />
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
    // Số trang trên URL vượt quá số trang thật (vd ?page=99), hoặc tài khoản cuối của trang vừa đổi vai trò
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
        <Table
          columns={columns}
          data={result.data.items}
          emptyText={filtered ? 'Không có tài khoản nào khớp bộ lọc.' : 'Chưa có tài khoản nào.'}
        />
        <div className={styles.pagination}>
          <Pagination page={page} totalPages={result.data.pagination.totalPages} onChange={handlePageChange} />
        </div>
      </>
    )
  }

  return (
    <>
      <h1>Phân quyền</h1>
      <p className={styles.intro}>
        Chọn tài khoản rồi chọn vai trò mới, hệ thống hỏi xác nhận trước khi lưu. Chỉ đổi qua lại giữa Nhà tuyển dụng và
        Ứng viên: không nâng tài khoản lên Quản trị viên và không đổi vai trò của chính mình.
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
        title="Xác nhận đổi vai trò"
        footer={
          <>
            <Button variant="secondary" onClick={closeConfirm} disabled={saving}>
              Hủy
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </>
        }
      >
        {confirm && (
          <div className={styles.modalBody}>
            <p className={styles.modalText}>
              Đổi vai trò của <strong>{confirm.user.email}</strong> từ "{roleLabel(confirm.user.role)}" sang "
              {roleLabel(confirm.role)}"?
            </p>
            <ul className={styles.consequences}>
              <li>
                Có hiệu lực ngay: tài khoản chỉ còn dùng được chức năng của vai trò mới. Người dùng tải lại trang hoặc
                đăng nhập lại để thấy menu mới.
              </li>
              <li>
                {confirm.role === ROLES.RECRUITER
                  ? 'Chưa có hồ sơ nhà tuyển dụng thì hệ thống tự tạo hồ sơ tối thiểu, gán vào công ty duy nhất của hệ thống.'
                  : 'Chưa có hồ sơ ứng viên thì hệ thống tự tạo hồ sơ tối thiểu.'}
              </li>
              <li>Dữ liệu cũ của tài khoản (hồ sơ, CV, tin tuyển dụng, đơn ứng tuyển) được giữ nguyên.</li>
            </ul>
            {confirmError && (
              <p className={styles.alertError} role="alert">
                {confirmError}
              </p>
            )}
          </div>
        )}
      </Modal>
    </>
  )
}

export default RoleManagement
