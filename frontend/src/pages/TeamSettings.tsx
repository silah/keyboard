import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'

interface TeamMember {
  id: string
  email: string
  name: string
  teamId: string
  createdAt: number
  updatedAt: number
}

const TeamSettings = () => {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [invitePassword, setInvitePassword] = useState('')
  
  const { user, team, token } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    loadMembers()
  }, [])

  const loadMembers = async () => {
    try {
      setLoading(true)
      const response = await fetch('http://localhost:3001/api/team/members', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setMembers(data)
      }
    } catch (err) {
      console.error('Failed to load members:', err)
    } finally {
      setLoading(false)
    }
  }

  const inviteMember = async () => {
    if (!inviteEmail || !inviteName || !invitePassword) {
      alert('All fields are required')
      return
    }

    try {
      const response = await fetch('http://localhost:3001/api/team/invite', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: inviteEmail,
          name: inviteName,
          tempPassword: invitePassword,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }

      const newMember = await response.json()
      setMembers([...members, newMember])
      setShowInviteModal(false)
      setInviteEmail('')
      setInviteName('')
      setInvitePassword('')
      
      alert(`User invited! They can log in with:\nEmail: ${inviteEmail}\nPassword: ${invitePassword}`)
    } catch (err: any) {
      alert(err.message || 'Failed to invite member')
    }
  }

  const removeMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) {
      return
    }

    try {
      const response = await fetch(`http://localhost:3001/api/team/members/${memberId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }

      setMembers(members.filter(m => m.id !== memberId))
    } catch (err: any) {
      alert(err.message || 'Failed to remove member')
    }
  }

  const isOwner = team?.ownerId === user?.id

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Team Settings</h1>
            <p className="text-sm text-gray-600">{team?.name}</p>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Team Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Team Information</h2>
          <div className="space-y-2">
            <p><span className="font-medium">Team Name:</span> {team?.name}</p>
            <p><span className="font-medium">Your Role:</span> {isOwner ? 'Owner' : 'Member'}</p>
          </div>
        </div>

        {/* Team Members */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Team Members ({members.length})</h2>
            {isOwner && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="bg-teal-500 text-white px-4 py-2 rounded-md hover:bg-teal-600"
              >
                + Invite Member
              </button>
            )}
          </div>

          {loading ? (
            <p className="text-gray-600">Loading...</p>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex justify-between items-center p-3 border border-gray-200 rounded-md"
                >
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-gray-600">{member.email}</p>
                    {member.id === team?.ownerId && (
                      <span className="text-xs bg-teal-100 text-teal-800 px-2 py-1 rounded mt-1 inline-block">
                        Owner
                      </span>
                    )}
                  </div>
                  {isOwner && member.id !== team?.ownerId && (
                    <button
                      onClick={() => removeMember(member.id)}
                      className="text-sm text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Invite Team Member</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Temporary Password
                </label>
                <input
                  type="text"
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="temp123"
                />
                <p className="text-xs text-gray-500 mt-1">
                  They can change this after first login
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowInviteModal(false)
                  setInviteEmail('')
                  setInviteName('')
                  setInvitePassword('')
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={inviteMember}
                className="px-4 py-2 bg-teal-500 text-white rounded-md hover:bg-teal-600"
              >
                Send Invite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TeamSettings
