import { useRouter } from 'next/navigation'
import BackgroundReplacement from '@/components/RealTimeBackground/RealTimeBackground'
export default function SquatTutorialPage() {
    const router = useRouter()
    return (
        <div className="bg-gray-900 min-h-screen text-white flex items-center justify-center">
            <div className="w-full">
                <BackgroundReplacement />
            </div>
        </div>
    )
}
