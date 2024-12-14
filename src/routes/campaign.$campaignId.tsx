import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { CONTRACT_ABI, CONTRACT_ADDRESS } from '@/lib/abi'
import { useReadContract } from 'wagmi'

export const Route = createFileRoute('/campaign/$campaignId')({
    component: RouteComponent,
})

function RouteComponent() {
    const { campaignId } = Route.useParams()

    const {
        data,
        isLoading,
        isError,
    } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'getCampaign',
        args: [BigInt(Number(campaignId))],
    })

    console.log("campaign", { data })


    if (isLoading) return <>loading campaign</>

    if (isError) return <>error loading campaign</>

    return <>
        {data}
    </>
}
