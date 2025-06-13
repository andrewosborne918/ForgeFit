"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Trash2, AlertTriangle, Shield, CheckCircle, XCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { getAuth, signOut } from "firebase/auth"
import { app } from "@/lib/firebase"
import { toast } from "sonner"

interface UserDeletionData {
  userId: string
  confirmationCode: string
  userInfo: {
    email: string
    createdAt: string
    plan: string
    workoutsGenerated: number
  }
  dataToDelete: {
    workoutLogs: number
    weeklyScheduleEntries: number
    hasStripeCustomer: boolean
    hasActiveSubscription: boolean
  }
  warning: string
}

interface DeletionResult {
  success: boolean
  deletedData: {
    firebaseAuth: boolean
    firestoreUser: boolean
    firestoreLogs: number
    firestoreSchedule: number
    stripeCustomer: boolean
    stripeSubscriptions: number
  }
  errors: string[]
  userId: string
  timestamp: string
}

interface AccountDeletionProps {
  userId: string
  userEmail: string
}

export function AccountDeletion({ userId, userEmail }: AccountDeletionProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [confirmationCode, setConfirmationCode] = useState("")
  const [enteredCode, setEnteredCode] = useState("")
  const [deletionData, setDeletionData] = useState<UserDeletionData | null>(null)
  const [deletionResult, setDeletionResult] = useState<DeletionResult | null>(null)
  const [error, setError] = useState("")
  
  const router = useRouter()

  const handleGetDeletionInfo = async () => {
    setIsLoading(true)
    setError("")
    
    try {
      const response = await fetch(`/api/delete-user?userId=${userId}`)
      if (!response.ok) {
        throw new Error('Failed to get deletion information')
      }
      
      const data: UserDeletionData = await response.json()
      setDeletionData(data)
      setConfirmationCode(data.confirmationCode)
      
    } catch (error) {
      console.error('Error getting deletion info:', error)
      setError('Failed to prepare account deletion. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!deletionData || enteredCode !== confirmationCode) {
      setError("Please enter the correct confirmation code")
      return
    }

    setIsDeleting(true)
    setError("")

    try {
      const response = await fetch('/api/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          confirmationCode: enteredCode,
          adminOverride: false
        })
      })

      const result: DeletionResult = await response.json()
      setDeletionResult(result)

      if (result.success) {
        toast.success("Account deleted successfully")
        
        // Sign out user
        try {
          if (app) {
            const auth = getAuth(app)
            await signOut(auth)
          }
        } catch (signOutError) {
          console.warn("Failed to sign out after deletion:", signOutError)
        }
        
        // Redirect to homepage
        setTimeout(() => {
          router.push('/')
        }, 2000)
        
      } else {
        setError(`Deletion partially failed. ${result.errors.join(', ')}`)
      }
      
    } catch (error) {
      console.error('Error deleting account:', error)
      setError('Failed to delete account. Please contact support.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleOpenDialog = () => {
    setIsOpen(true)
    handleGetDeletionInfo()
  }

  const handleProceedToConfirmation = () => {
    setIsOpen(false)
    setIsConfirmOpen(true)
  }

  const resetDialogs = () => {
    setIsOpen(false)
    setIsConfirmOpen(false)
    setEnteredCode("")
    setError("")
    setDeletionData(null)
    setDeletionResult(null)
  }

  return (
    <>
      {/* Main Delete Account Button */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            className="w-full border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950"
            onClick={handleOpenDialog}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Account
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Account
            </DialogTitle>
            <DialogDescription>
              This action will permanently delete your ForgeFit account and all associated data.
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="py-6 text-center">
              <div className="animate-spin h-8 w-8 border-4 border-orange-200 border-t-orange-500 rounded-full mx-auto mb-4"></div>
              <p>Loading account information...</p>
            </div>
          ) : deletionData ? (
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <strong>Warning:</strong> {deletionData.warning}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-slate-900 dark:text-white">Account Information</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Email:</div>
                  <div className="font-mono">{deletionData.userInfo.email}</div>
                  <div>Plan:</div>
                  <div className="capitalize">{deletionData.userInfo.plan}</div>
                  <div>Workouts Generated:</div>
                  <div>{deletionData.userInfo.workoutsGenerated}</div>
                </div>
              </div>

              <div className="bg-red-50 dark:bg-red-950 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-red-900 dark:text-red-100">Data to be Deleted</h4>
                <ul className="text-sm text-red-800 dark:text-red-200 space-y-1">
                  <li>• Your account and profile information</li>
                  <li>• {deletionData.dataToDelete.workoutLogs} workout logs and history</li>
                  <li>• {deletionData.dataToDelete.weeklyScheduleEntries} weekly schedule entries</li>
                  {deletionData.dataToDelete.hasStripeCustomer && (
                    <li>• Payment methods and billing information</li>
                  )}
                  {deletionData.dataToDelete.hasActiveSubscription && (
                    <li>• Active subscription (will be cancelled)</li>
                  )}
                </ul>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                    <div className="text-sm text-red-800">{error}</div>
                  </div>
                </div>
              )}
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-3">
                <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                <div className="text-sm text-red-800">{error}</div>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleProceedToConfirmation}
              disabled={isLoading || !deletionData}
            >
              Continue to Confirmation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Shield className="h-5 w-5" />
              Final Confirmation Required
            </AlertDialogTitle>
            <AlertDialogDescription>
              To confirm account deletion, please type the following confirmation code:
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deletionResult ? (
            <div className="space-y-4">
              {deletionResult.success ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    <div className="text-sm text-green-800">
                      Account successfully deleted. You will be redirected to the homepage.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      Deletion partially completed with some errors: {deletionResult.errors.join(', ')}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Deletion Summary</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Firebase Auth:</div>
                  <div>{deletionResult.deletedData.firebaseAuth ? '✅ Deleted' : '❌ Failed'}</div>
                  <div>User Profile:</div>
                  <div>{deletionResult.deletedData.firestoreUser ? '✅ Deleted' : '❌ Failed'}</div>
                  <div>Workout Logs:</div>
                  <div>✅ {deletionResult.deletedData.firestoreLogs} deleted</div>
                  <div>Schedule Entries:</div>
                  <div>✅ {deletionResult.deletedData.firestoreSchedule} deleted</div>
                  <div>Stripe Customer:</div>
                  <div>{deletionResult.deletedData.stripeCustomer ? '✅ Deleted' : '⚪ Not applicable'}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-slate-100 dark:bg-slate-700 rounded-lg p-3 text-center">
                <code className="text-lg font-mono font-bold tracking-wider">
                  {confirmationCode}
                </code>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmCode">Enter confirmation code:</Label>
                <Input
                  id="confirmCode"
                  value={enteredCode}
                  onChange={(e) => setEnteredCode(e.target.value.toUpperCase())}
                  placeholder="Type the confirmation code"
                  className="font-mono"
                  disabled={isDeleting}
                />
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                    <div className="text-sm text-red-800">{error}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          <AlertDialogFooter>
            {!deletionResult && (
              <>
                <AlertDialogCancel onClick={resetDialogs} disabled={isDeleting}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  disabled={isDeleting || enteredCode !== confirmationCode}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isDeleting ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Deleting Account...
                    </>
                  ) : (
                    'Delete My Account Forever'
                  )}
                </AlertDialogAction>
              </>
            )}
            {deletionResult && (
              <AlertDialogAction onClick={resetDialogs}>
                Close
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
