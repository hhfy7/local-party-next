import type { User } from '@local-party/shared/src/types'

interface NameEditorProps {
  currentUser: User | null
  isEditing: boolean
  setIsEditing: (isEditing: boolean) => void
  tempName: string
  setTempName: (name: string) => void
  onConfirm: () => void
}

export const NameEditor = ({
  currentUser,
  isEditing,
  setIsEditing,
  tempName,
  setTempName,
  onConfirm,
}: NameEditorProps) => {
  if (isEditing) {
    return (
      <div className="animate-fade-in flex items-center gap-2 rounded-2xl border border-indigo-100 bg-white p-1.5 shadow-lg ring-2 shadow-indigo-50 ring-indigo-50">
        <input
          autoFocus
          maxLength={12}
          className="flex-1 border-0 bg-transparent px-3 py-2 text-sm font-bold text-gray-900 outline-none placeholder:font-normal focus:ring-0"
          value={tempName}
          onChange={e => setTempName(e.target.value)}
          placeholder="新昵称"
          onKeyDown={e => e.key === 'Enter' && onConfirm()}
        />
        <button
          onClick={onConfirm}
          className="rounded-xl bg-indigo-600 p-2 text-white shadow-md transition-all hover:scale-105 hover:bg-indigo-700 active:scale-95"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </button>
        <button
          onClick={() => setIsEditing(false)}
          className="rounded-xl p-2 text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-600"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div className="group flex cursor-default items-center justify-between rounded-2xl border border-gray-100 bg-gray-50/50 p-3 transition-all hover:border-indigo-100 hover:bg-white hover:shadow-md hover:shadow-indigo-50">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-gradient-to-br from-indigo-500 to-purple-600 font-black text-white shadow-lg shadow-indigo-200 transition-transform group-hover:scale-105">
          {currentUser?.username?.[0]?.toUpperCase()}
        </div>
        <div>
          <div className="mb-0.5 text-[10px] font-bold tracking-widest text-gray-400 uppercase">
            Your Identity
          </div>
          <div className="text-base font-black tracking-tight text-gray-900">
            {currentUser?.username}
          </div>
        </div>
      </div>
      <button
        onClick={() => {
          setTempName(currentUser?.username || '')
          setIsEditing(true)
        }}
        className="rounded-xl border border-indigo-100 bg-white px-4 py-2 text-xs font-bold text-indigo-600 opacity-0 shadow-sm transition-all group-hover:opacity-100 hover:border-indigo-200 hover:shadow-md active:scale-95"
      >
        修改
      </button>
    </div>
  )
}
