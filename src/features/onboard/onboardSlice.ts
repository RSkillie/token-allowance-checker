import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import Onboard from 'bnc-onboard'
import Web3 from 'web3'
import * as H from 'history'
import { AppDispatch, AppThunk } from '../../app/store'
import { API, Wallet, WalletInitOptions } from 'bnc-onboard/dist/src/interfaces'
import { setWalletAddressThunk } from '../addressInput/AddressSlice'
import apiKeys from '../../api/apikeys'
import { NavigateFunction } from 'react-router-dom'

const infuraCredentials = apiKeys.infura[1]
const onboardCredentials = apiKeys.onboard[1]

const wallets: Partial<WalletInitOptions>[] = [
  { walletName: 'metamask' },
  { walletName: 'coinbase' },
  {
    walletName: 'walletConnect',
    infuraKey: infuraCredentials.apikey
  },
  { walletName: 'tokenpocket' },
  {
    walletName: 'ledger',
    rpcUrl: `${infuraCredentials.endpoint}${infuraCredentials.apikey}`
  },
  {
    walletName: 'trezor',
    appUrl: 'https://tac.dappstar.io',
    email: 'michael@m-bauer.org',
    rpcUrl: `${infuraCredentials.endpoint}${infuraCredentials.apikey}`
  },
  { walletName: 'status' },
  { walletName: 'trust' },
  {
    walletName: 'lattice',
    rpcUrl: `${infuraCredentials.endpoint}${infuraCredentials.apikey}`,
    appName: 'Token Allowance Checker'
  },
  { walletName: 'authereum' },
  { walletName: 'opera' },
  { walletName: 'operaTouch' },
  { walletName: 'torus' },
  {
    walletName: 'imToken',
    rpcUrl: `${infuraCredentials.endpoint}${infuraCredentials.apikey}`
  },
  {
    walletName: 'huobiwallet',
    rpcUrl: `${infuraCredentials.endpoint}${infuraCredentials.apikey}`
  },
  { walletName: 'frame' },
  { walletName: 'gnosis' }
]

// Define contents of onboard state
interface OnboardState {
  onboardAPI: API | null
  web3?: Web3
  wallet?: Wallet
  networkId: number
  requiredNetworkId: number
}

const initialState: OnboardState = {
  networkId: 0,
  requiredNetworkId: 1,
  onboardAPI: null,
  wallet: undefined
}

const onboardSlice = createSlice({
  name: 'onboard',
  initialState: initialState,
  reducers: {
    setOnboardAPI(state, action: PayloadAction<API>) {
      state.onboardAPI = action.payload
    },
    setWallet(state, action: PayloadAction<Wallet>) {
      state.wallet = action.payload
    },
    setWeb3Instance(state, action: PayloadAction<Web3>) {
      state.web3 = action.payload
    },
    setNetworkId(state, action: PayloadAction<number>) {
      state.networkId = action.payload
    },
    setRequiredNetworkId(state, action: PayloadAction<number>) {
      state.requiredNetworkId = action.payload
    }
  }
})

export const {
  setOnboardAPI,
  setNetworkId,
  setWeb3Instance,
  setWallet,
  setRequiredNetworkId
} = onboardSlice.actions

export default onboardSlice.reducer

export const checkWallet = (): AppThunk => async (dispatch, getState) => {
  console.log(`checking wallet...`)
  const onboardAPI = getState().onboard.onboardAPI
  if (onboardAPI) {
    const result = await onboardAPI.walletCheck()
    console.log(`walletCheck result: ${result}`)
  } else {
    console.log(`dispatched checkWallet() without initialization...`)
  }
}

export const selectWallet =
  (navigate: NavigateFunction): AppThunk =>
  async (dispatch, getState) => {
    console.log(`Selecting wallet...`)
    const onboardAPI = getState().onboard.onboardAPI
    if (onboardAPI) {
      const result = await onboardAPI.walletSelect()
      if (!result) {
        // user closed modal without selecting a wallet. If there was a
        // wallet selected previously just keep using it. Otherwise, send
        // her back to home page.
        // Should actually just check for getState().wallet below, but unfortunately the wallet object is
        // existing in onboardAPI.getState(), but all members are 'null'. This is not expected
        // according to typescript defintions.
        if (!onboardAPI.getState().wallet?.name) {
          console.log(`No wallet selected.`)
          navigate('/')
        }
      } else {
        // to get access to account
        dispatch(checkWallet())
      }
    } else {
      console.log(`dispatched selectWallet() without initialization...`)
    }
  }

export const setRequiredNetworkIdThunk =
  (networkId: number): AppThunk =>
  (dispatch, getState) => {
    dispatch(setRequiredNetworkId(networkId))
    const onboardAPI = getState().onboard.onboardAPI
    if (onboardAPI) {
      // update existing onboardAPI object
      onboardAPI.config({ networkId: networkId })
      // issue checkWallet to make sure user has selected expected network in e.g. Metamask
      dispatch(checkWallet())
    } else {
      // onboardAPI not yet initialized
    }
  }

export const initialize =
  (navigate: NavigateFunction): AppThunk =>
  async (dispatch, getState) => {
    const requiredNetworkId = getState().onboard.requiredNetworkId
    console.log(`Initializing OnBoard.js for networkId ${requiredNetworkId}...`)
    const onboard = Onboard({
      dappId: onboardCredentials.apikey,
      networkId: requiredNetworkId,
      hideBranding: false,
      subscriptions: {
        wallet: (wallet) => {
          // store selected wallet
          dispatch(setWallet(wallet))
          dispatch(setWeb3Instance(new Web3(wallet.provider)))
        },
        address: (addressId) => {
          if (addressId) {
            console.log(`Wallet address changed to ${addressId}!`)
            dispatch(setWalletAddressThunk(addressId.toLowerCase(), navigate))
          } else {
            console.log(`No access to wallet address`)
          }
        },
        network: (networkId) => {
          const prevNetworkId = getState().onboard.networkId
          if (prevNetworkId !== 0 && prevNetworkId !== networkId) {
            console.log(
              `Switching network from ${prevNetworkId} to ${networkId}`
            )
          }
          dispatch(setRequiredNetworkIdThunk(networkId))
          dispatch(setNetworkId(networkId))
        },
        balance: () => {
          /* do nothing*/
        }
      },
      walletSelect: {
        heading: '',
        description: '',
        // @ts-ignore
        wallets: wallets
      }
    })
    dispatch(setOnboardAPI(onboard))
  }
