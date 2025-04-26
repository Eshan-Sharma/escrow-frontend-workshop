'use client'

import { getEscrowProgram, getEscrowProgramId } from '@project/anchor'
import { useConnection } from '@solana/wallet-adapter-react'
import { BN } from '@coral-xyz/anchor'
import { Cluster, PublicKey, SystemProgram } from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { useTransactionToast } from '../use-transaction-toast'
import { toast } from 'sonner'
import { findEscrowPDA, findVaultPDA, findUserTokenAccountPDA } from '@/utils/pda-utils'
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token'

export function useEscrowProgram() {
  const { connection } = useConnection()
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
  const programId = useMemo(() => getEscrowProgramId(cluster.network as Cluster), [cluster])
  const program = useMemo(() => getEscrowProgram(provider, programId), [provider, programId])

  const accounts = useQuery({
    queryKey: ['escrow', 'all', { cluster }],
    queryFn: () => program.account.escrow.all(),
  })

  const getProgramAccount = useQuery({
    queryKey: ['get-program-account', { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  })

  return {
    program,
    programId,
    accounts,
    getProgramAccount,
  }
}

export function useEscrowProgramAccount({
  maker,
  seed,
}: {
  maker: PublicKey
  seed: BN
}) {
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const { program, accounts } = useEscrowProgram()

  const escrowPDA = useMemo(() => findEscrowPDA(maker, seed), [maker, seed])

  const accountQuery = useQuery({
    queryKey: ['escrow', 'fetch', { cluster, escrowPDA }],
    queryFn: () => program.account.escrow.fetch(escrowPDA),
    enabled: !!escrowPDA,
  })

  const makeEscrow = useMutation({
    mutationKey: ['escrow', 'make', { cluster, escrowPDA }],
    mutationFn: async ({
      receiveAmount,
      depositAmount,
    }: {
      receiveAmount: BN
      depositAmount: BN
    }) => {
      const vault = findVaultPDA(escrowPDA, accountQuery.data!.tokenMintA)
      const makerTokenAccountA = findUserTokenAccountPDA(maker, accountQuery.data!.tokenMintA)

      return program.methods
        .make(seed, receiveAmount, depositAmount)
        .accounts({
          maker,
          escrow: escrowPDA,
          vault,
          makerTokenAccountA,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc()
    },
    onSuccess: (tx) => {
      transactionToast(tx)
      return accountQuery.refetch()
    },
    onError: () => toast.error('Failed to create escrow.'),
  })

  const exchangeEscrow = useMutation({
    mutationKey: ['escrow', 'exchange', { cluster, escrowPDA }],
    mutationFn: async ({
      taker,
    }: {
      taker: PublicKey
    }) => {
      const vault = findVaultPDA(escrowPDA, accountQuery.data!.tokenMintA)
      const takerTokenAccountA = findUserTokenAccountPDA(taker, accountQuery.data!.tokenMintA)
      const takerTokenAccountB = findUserTokenAccountPDA(taker, accountQuery.data!.tokenMintB)
      const makerTokenAccountB = findUserTokenAccountPDA(maker, accountQuery.data!.tokenMintB)

      return program.methods
        .exchange()
        .accounts({
          taker,
          escrow: escrowPDA,
          takerTokenAccountA,
          takerTokenAccountB,
          makerTokenAccountB,
          vault,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc()
    },
    onSuccess: (tx) => {
      transactionToast(tx)
      return accounts.refetch()
    },
    onError: () => toast.error('Failed to exchange escrow.'),
  })

  const refundEscrow = useMutation({
    mutationKey: ['escrow', 'refund', { cluster, escrowPDA }],
    mutationFn: async () => {
      const vault = findVaultPDA(escrowPDA, accountQuery.data!.tokenMintA)
      const makerTokenAccountA = findUserTokenAccountPDA(maker, accountQuery.data!.tokenMintA)

      return program.methods
        .refund()
        .accounts({
          maker,
          escrow: escrowPDA,
          makerTokenAccountA,
          vault,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc()
    },
    onSuccess: (tx) => {
      transactionToast(tx)
      return accounts.refetch()
    },
    onError: () => toast.error('Failed to refund escrow.'),
  })

  return {
    escrowPDA,
    accountQuery,
    makeEscrow,
    exchangeEscrow,
    refundEscrow,
  }
}
