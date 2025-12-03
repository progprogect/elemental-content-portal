import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fieldTemplatesApi, FieldTemplate } from '../services/api/tasks'
import { PlusIcon } from '@heroicons/react/24/outline'
import Button from './ui/Button'
import Modal from './ui/Modal'
import FieldEditor from './FieldEditor'

export default function FieldTemplatesManager() {
  const [isOpen, setIsOpen] = useState(false)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<FieldTemplate | undefined>()
  const queryClient = useQueryClient()

  const { data: templates, isLoading } = useQuery({
    queryKey: ['field-templates'],
    queryFn: fieldTemplatesApi.getTemplates,
  })

  const deleteMutation = useMutation({
    mutationFn: fieldTemplatesApi.deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-templates'] })
    },
  })

  const handleCreateTemplate = () => {
    setEditingTemplate(undefined)
    setIsEditorOpen(true)
  }

  const handleEditTemplate = (template: FieldTemplate) => {
    setEditingTemplate(template)
    setIsEditorOpen(true)
  }

  const handleSaveTemplate = async (fieldData: {
    fieldName: string
    fieldType: 'text' | 'file' | 'url' | 'checkbox'
    fieldValue: any
  }) => {
    if (editingTemplate) {
      await fieldTemplatesApi.updateTemplate(editingTemplate.id, {
        fieldName: fieldData.fieldName,
        fieldType: fieldData.fieldType,
        defaultValue: fieldData.fieldValue,
      })
    } else {
      await fieldTemplatesApi.createTemplate({
        fieldName: fieldData.fieldName,
        fieldType: fieldData.fieldType,
        defaultValue: fieldData.fieldValue,
      })
    }
    queryClient.invalidateQueries({ queryKey: ['field-templates'] })
    setIsEditorOpen(false)
    setEditingTemplate(undefined)
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-primary-600 text-white p-4 rounded-full shadow-lg hover:bg-primary-700 transition-colors flex items-center justify-center"
        aria-label="Manage field templates"
      >
        <PlusIcon className="h-6 w-6" />
      </button>

      {/* Templates Modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Шаблоны полей"
        footer={
          <div className="flex justify-between w-full">
            <Button variant="primary" onClick={handleCreateTemplate}>
              <PlusIcon className="h-4 w-4 mr-2 inline" />
              Создать шаблон
            </Button>
            <Button variant="secondary" onClick={() => setIsOpen(false)}>
              Закрыть
            </Button>
          </div>
        }
      >
        {isLoading ? (
          <div className="text-center py-8">Загрузка...</div>
        ) : templates && templates.length > 0 ? (
          <div className="space-y-2">
            {templates.map((template) => (
              <div
                key={template.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {template.icon && <span>{template.icon}</span>}
                  <div>
                    <div className="font-medium">{template.fieldName}</div>
                    <div className="text-sm text-gray-500">{template.fieldType}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditTemplate(template)}
                    className="text-primary-600 hover:text-primary-700 text-sm"
                  >
                    Редактировать
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Удалить шаблон "${template.fieldName}"?`)) {
                        deleteMutation.mutate(template.id)
                      }
                    }}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            Нет шаблонов. Создайте первый шаблон поля.
          </div>
        )}
      </Modal>

      {/* Field Editor Modal for Templates */}
      <FieldEditor
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false)
          setEditingTemplate(undefined)
        }}
        onSave={handleSaveTemplate}
        field={editingTemplate ? {
          id: editingTemplate.id,
          fieldName: editingTemplate.fieldName,
          fieldType: editingTemplate.fieldType,
          fieldValue: editingTemplate.defaultValue || (editingTemplate.fieldType === 'checkbox' ? { checked: false } : { value: '' }),
          orderIndex: editingTemplate.orderIndex,
          taskId: '',
          createdAt: '',
        } : undefined}
      />
    </>
  )
}


