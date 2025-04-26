import { PublicKey } from '@solana/web3.js'
import { BN } from '@coral-xyz/anchor'

export const ESCROW_PROGRAM_ID = new PublicKey('59GtTsmaBRiCQSLV1xBzsYCFRyZiuvvDKKuwaAEv7788')

/**
 * Derive the PDA for the escrow account.
 */
export function findEscrowPDA(maker: PublicKey, seed: BN): PublicKey {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('escrow'),
      maker.toBuffer(),
      seed.toArrayLike(Buffer, 'le', 8), // u64 must be LE (little-endian)
    ],
    ESCROW_PROGRAM_ID
  )[0]
}

/**
 * Derive the PDA for the vault account.
 */
export function findVaultPDA(escrow: PublicKey, tokenMint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [
      escrow.toBuffer(),
      Buffer.from([
        6, 221, 246, 225, 215, 101, 161, 147, 217, 203, 225, 70,
        206, 235, 121, 172, 28, 180, 133, 237, 95, 91, 55, 145,
        58, 140, 245, 133, 126, 255, 0, 169
      ]),
      tokenMint.toBuffer()
    ],
    ESCROW_PROGRAM_ID
  )[0]
}

/**
 * Derive the PDA for the user's token accounts used in escrow.
 */
export function findUserTokenAccountPDA(user: PublicKey, tokenMint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [
      user.toBuffer(),
      Buffer.from([
        6, 221, 246, 225, 215, 101, 161, 147, 217, 203, 225, 70,
        206, 235, 121, 172, 28, 180, 133, 237, 95, 91, 55, 145,
        58, 140, 245, 133, 126, 255, 0, 169
      ]),
      tokenMint.toBuffer()
    ],
    ESCROW_PROGRAM_ID
  )[0]
}
