import { UserItem } from '@/components/chat/UserItem'
import type { User } from '@local-party/shared/src/types'

interface UserListProps {
  users: User[]
  currentUser: User | null
  hostId: string | null
  isHost: boolean
}

export const UserList = ({
  users,
  currentUser,
  hostId,
  isHost,
}: UserListProps) => {
  const hostDuration = users.find(user => user.id === hostId)?.videoDuration

  return (
    <div className="scrollbar-hide flex shrink-0 gap-2.5 overflow-x-auto border-b border-gray-100 bg-white px-6 py-4">
      {users.map(u => (
        <UserItem
          key={u.id}
          user={u}
          isHost={u.id === hostId}
          isMe={u.id === currentUser?.id}
          amIHost={isHost}
          hostDuration={hostDuration}
          variant="horizontal"
        />
      ))}
    </div>
  )
}
