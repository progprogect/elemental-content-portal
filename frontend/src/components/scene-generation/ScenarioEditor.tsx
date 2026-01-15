import { useState, useEffect } from 'react'
import { Scenario, TimelineItem } from '../../../scene-generation-service/src/types/scene-generation'
import Button from '../ui/Button'
import { TrashIcon, PlusIcon } from '@heroicons/react/24/outline'

interface ScenarioEditorProps {
  scenario: Scenario
  onSave: (scenario: Scenario) => void
  onCancel: () => void
}

export default function ScenarioEditor({ scenario, onSave, onCancel }: ScenarioEditorProps) {
  const [editedScenario, setEditedScenario] = useState<Scenario>(scenario)

  const updateTimelineItem = (index: number, updates: Partial<TimelineItem>) => {
    const newTimeline = [...editedScenario.timeline]
    newTimeline[index] = { ...newTimeline[index], ...updates }
    setEditedScenario({ ...editedScenario, timeline: newTimeline })
  }

  const deleteTimelineItem = (index: number) => {
    const newTimeline = editedScenario.timeline.filter((_, i) => i !== index)
    setEditedScenario({ ...editedScenario, timeline: newTimeline })
  }

  const addTimelineItem = () => {
    const newItem: TimelineItem = {
      id: `scene_${Date.now()}`,
      kind: 'banner',
      durationSeconds: 5,
      detailedRequest: {
        description: 'New scene',
        textContent: '',
      },
    }
    setEditedScenario({
      ...editedScenario,
      timeline: [...editedScenario.timeline, newItem],
    })
  }

  const handleSave = () => {
    onSave(editedScenario)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Edit Scenario</h2>
        <div className="flex gap-2">
          <Button onClick={onCancel} variant="ghost">
            Cancel
          </Button>
          <Button onClick={handleSave} variant="primary">
            Save Changes
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {editedScenario.timeline.map((item, index) => (
          <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900">
                  Scene {index + 1}: {item.kind}
                </h3>
                <p className="text-sm text-gray-500">ID: {item.id}</p>
              </div>
              <Button
                onClick={() => deleteTimelineItem(index)}
                variant="ghost"
                className="text-red-600 hover:text-red-700"
              >
                <TrashIcon className="h-5 w-5" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (seconds)
                </label>
                <input
                  type="number"
                  value={item.durationSeconds || ''}
                  onChange={(e) =>
                    updateTimelineItem(index, {
                      durationSeconds: parseFloat(e.target.value) || undefined,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  step="0.1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kind</label>
                <select
                  value={item.kind}
                  onChange={(e) =>
                    updateTimelineItem(index, { kind: e.target.value as TimelineItem['kind'] })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="banner">Banner</option>
                  <option value="video">Video</option>
                  <option value="overlay">Overlay</option>
                  <option value="pip">PiP</option>
                  <option value="transition">Transition</option>
                </select>
              </div>

              {item.kind === 'video' || item.kind === 'overlay' || item.kind === 'pip' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Source Video ID
                    </label>
                    <input
                      type="text"
                      value={item.sourceVideoId || ''}
                      onChange={(e) =>
                        updateTimelineItem(index, { sourceVideoId: e.target.value || undefined })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      From (seconds)
                    </label>
                    <input
                      type="number"
                      value={item.fromSeconds || ''}
                      onChange={(e) =>
                        updateTimelineItem(index, {
                          fromSeconds: parseFloat(e.target.value) || undefined,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      step="0.1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      To (seconds)
                    </label>
                    <input
                      type="number"
                      value={item.toSeconds || ''}
                      onChange={(e) =>
                        updateTimelineItem(index, {
                          toSeconds: parseFloat(e.target.value) || undefined,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      step="0.1"
                    />
                  </div>
                </>
              ) : null}

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={item.detailedRequest.description || ''}
                  onChange={(e) =>
                    updateTimelineItem(index, {
                      detailedRequest: {
                        ...item.detailedRequest,
                        description: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>

              {item.kind === 'banner' ? (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Text Content
                  </label>
                  <input
                    type="text"
                    value={item.detailedRequest.textContent || ''}
                    onChange={(e) =>
                      updateTimelineItem(index, {
                        detailedRequest: {
                          ...item.detailedRequest,
                          textContent: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <Button onClick={addTimelineItem} variant="ghost" className="w-full">
        <PlusIcon className="h-5 w-5 mr-2" />
        Add Scene
      </Button>
    </div>
  )
}

