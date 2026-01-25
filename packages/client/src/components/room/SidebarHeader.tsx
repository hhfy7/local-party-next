import { NameEditor } from './NameEditor'
import type { User } from '@local-party/shared/src/types'

interface SidebarHeaderProps {
  roomId: string
  currentUser: User | null
  isEditingName: boolean
  setIsEditingName: (v: boolean) => void
  tempName: string
  setTempName: (v: string) => void
  handleUpdateName: () => void
  onCopyLink: () => void
}

export const SidebarHeader = ({
  roomId,
  currentUser,
  isEditingName,
  setIsEditingName,
  tempName,
  setTempName,
  handleUpdateName,
  onCopyLink,
}: SidebarHeaderProps) => {
  return (
    <div className="sticky top-0 z-10 shrink-0 border-b border-gray-100 bg-white/50 p-6 backdrop-blur-xl">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-black tracking-tight text-gray-900">
          Room{' '}
          <span className="ml-1 rounded-lg bg-indigo-50 px-2 py-0.5 font-mono text-lg text-indigo-600">
            {roomId}
          </span>
        </h2>
        <button
          onClick={onCopyLink}
          className="rounded-xl p-2.5 text-gray-400 shadow-sm ring-1 ring-gray-100 transition-all hover:bg-indigo-50 hover:text-indigo-600 active:scale-95"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
            />
          </svg>
        </button>
      </div>
      <NameEditor
        currentUser={currentUser}
        isEditing={isEditingName}
        setIsEditing={setIsEditingName}
        tempName={tempName}
        setTempName={setTempName}
        onConfirm={handleUpdateName}
      />
    </div>
  )
}
