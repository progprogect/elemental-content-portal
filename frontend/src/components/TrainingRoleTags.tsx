import { TrainingRole } from '../services/api/training'

interface TrainingRoleTagsProps {
  roles: TrainingRole[]
  maxVisible?: number
}

export default function TrainingRoleTags({ roles, maxVisible = 4 }: TrainingRoleTagsProps) {
  if (!roles || roles.length === 0) {
    return null
  }

  const visibleRoles = roles.slice(0, maxVisible)
  const remainingCount = roles.length - maxVisible

  return (
    <div className="flex flex-wrap gap-1.5">
      {visibleRoles.map((role) => (
        <span
          key={role.id}
          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
          title={role.description || role.name}
        >
          {role.name}
        </span>
      ))}
      {remainingCount > 0 && (
        <span
          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600"
          title={roles.slice(maxVisible).map(r => r.name).join(', ')}
        >
          +{remainingCount}
        </span>
      )}
    </div>
  )
}







