'use client'

import { PublicKey } from '@solana/web3.js'
import { useState } from 'react'
import { ExplorerLink } from '../cluster/cluster-ui'
import { useEscrowProgram, useEscrowProgramAccount } from './escrow-data-access'
import { ellipsify } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { BN } from '@coral-xyz/anchor'

/**
 * Create Escrow Component
 */
export function EscrowCreate() {
  const [seed, setSeed] = useState('')
  const [receiveAmount, setReceiveAmount] = useState('')
  const [depositAmount, setDepositAmount] = useState('')
  const [tokenMintA, setTokenMintA] = useState('')
  const [tokenMintB, setTokenMintB] = useState('')
  const { program } = useEscrowProgram()

  const { makeEscrow } = useEscrowProgramAccount({
    maker: program.provider.publicKey!,
    seed: new BN(seed || 0),
  })

  const handleCreate = async () => {
    if (!seed || !receiveAmount || !depositAmount || !tokenMintA || !tokenMintB) {
      alert('Please fill all fields.')
      return
    }

    const receive = Number(receiveAmount)
    const deposit = Number(depositAmount)

    if (isNaN(receive) || isNaN(deposit)) {
      alert('Receive and Deposit amounts must be valid numbers.')
      return
    }

    try {
      const multiplier = 1_000_000 // adjust depending on your token decimals

      await makeEscrow.mutateAsync({
        receiveAmount: new BN(Math.floor(receive * multiplier)),
        depositAmount: new BN(Math.floor(deposit * multiplier)),
        tokenMintA: new PublicKey(tokenMintA),
        tokenMintB: new PublicKey(tokenMintB),
      })

      alert('Escrow created successfully!')

      // Clear form
      setSeed('')
      setReceiveAmount('')
      setDepositAmount('')
      setTokenMintA('')
      setTokenMintB('')
    } catch (error) {
      console.error(error)
      alert('Failed to create escrow.')
    }
  }

  const handleNumericInput = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (/^\d*\.?\d*$/.test(value)) {
      setter(value)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Escrow</CardTitle>
        <CardDescription>Fill the details and create an escrow offer</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="Seed (integer)"
          value={seed}
          onChange={(e) => setSeed(e.target.value.replace(/\D/g, ''))}
        />
        <Input
          placeholder="Receive Amount"
          value={receiveAmount}
          onChange={handleNumericInput(setReceiveAmount)}
        />
        <Input
          placeholder="Deposit Amount"
          value={depositAmount}
          onChange={handleNumericInput(setDepositAmount)}
        />
        <Input
          placeholder="Token Mint A (address)"
          value={tokenMintA}
          onChange={(e) => setTokenMintA(e.target.value)}
        />
        <Input
          placeholder="Token Mint B (address)"
          value={tokenMintB}
          onChange={(e) => setTokenMintB(e.target.value)}
        />
        <Button onClick={handleCreate} disabled={makeEscrow.isPending}>
          {makeEscrow.isPending ? 'Creating...' : 'Create Escrow'}
        </Button>
      </CardContent>
    </Card>
  )
}

/**
 * Escrow List Component
 */
export function EscrowList() {
  const { accounts, getProgramAccount } = useEscrowProgram()

  if (getProgramAccount.isLoading) {
    return <span className="loading loading-spinner loading-lg"></span>
  }

  if (!getProgramAccount.data?.value) {
    return (
      <div className="alert alert-info flex justify-center">
        <span>Program account not found. Make sure you have deployed the program and are on the correct cluster.</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {accounts.isLoading ? (
        <span className="loading loading-spinner loading-lg"></span>
      ) : accounts.data?.length ? (
        <div className="grid md:grid-cols-2 gap-4">
          {accounts.data.map((account) => (
            <EscrowCard key={account.publicKey.toString()} account={account.publicKey} />
          ))}
        </div>
      ) : (
        <div className="text-center">
          <h2 className="text-2xl">No Escrows</h2>
          <p>No escrow offers found. Create one above to get started.</p>
        </div>
      )}
    </div>
  )
}

/**
 * Escrow Card Component
 */
function EscrowCard({ account }: { account: PublicKey }) {
  const { accountQuery, exchangeEscrow, refundEscrow } = useEscrowProgramAccount({
    maker: account,
    seed: new BN(0), // adjust if you use dynamic seeds
  })

  const escrow = accountQuery.data

  const handleExchange = async () => {
    if (!escrow) return

    try {
      await exchangeEscrow.mutateAsync({
        taker: account,
      })
      alert('Exchange successful!')
    } catch (error) {
      console.error(error)
      alert('Exchange failed.')
    }
  }

  const handleRefund = async () => {
    if (!escrow) return

    try {
      await refundEscrow.mutateAsync()
      alert('Refund successful!')
    } catch (error) {
      console.error(error)
      alert('Refund failed.')
    }
  }

  if (accountQuery.isLoading) {
    return <span className="loading loading-spinner loading-lg"></span>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Escrow</CardTitle>
        <CardDescription>
          Account: <ExplorerLink path={`account/${account}`} label={ellipsify(account.toString())} />
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>Maker: {ellipsify(escrow?.maker?.toString() ?? '')}</div>
        <div>Token A: {ellipsify(escrow?.tokenMintA?.toString() ?? '')}</div>
        <div>Token B: {ellipsify(escrow?.tokenMintB?.toString() ?? '')}</div>
        <div>Receive Amount: {escrow?.receiveAmount?.toString()}</div>

        <div className="flex gap-4">
          <Button
            variant="outline"
            onClick={handleExchange}
            disabled={exchangeEscrow.isPending}
          >
            {exchangeEscrow.isPending ? 'Exchanging...' : 'Exchange'}
          </Button>

          <Button
            variant="destructive"
            onClick={handleRefund}
            disabled={refundEscrow.isPending}
          >
            {refundEscrow.isPending ? 'Refunding...' : 'Refund'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
