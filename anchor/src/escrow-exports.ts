// Here we export some useful types and functions for interacting with the Anchor program.
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { Cluster, PublicKey } from '@solana/web3.js'
import EscrowIDL from '../target/idl/escrow.json'
import type { Escrow } from '../target/types/escrow'

// Re-export the generated IDL and type
export { Escrow, EscrowIDL }

// The programId is imported from the program IDL.
export const ESCROW_PROGRAM_ID = new PublicKey(EscrowIDL.address)

// This is a helper function to get the Escrow Anchor program.
export function getEscrowProgram(provider: AnchorProvider, address?: PublicKey): Program<Escrow> {
  return new Program({ ...EscrowIDL, address: address ? address.toBase58() : EscrowIDL.address } as Escrow, provider)
}

// This is a helper function to get the program ID for the Escrow program depending on the cluster.
export function getEscrowProgramId(cluster: Cluster) {
  switch (cluster) {
    case 'devnet':
      return new PublicKey('AyWrbbmJq9NisKiSag3V3ETeNmZ8WETMeSDopgiwNmbG')
    case 'testnet':
    case 'mainnet-beta':
    default:
      return ESCROW_PROGRAM_ID
  }
}
