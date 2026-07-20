import { Web3ReactProvider } from '@web3-react/core'
import { Provider } from 'react-redux'
import { getLibrary } from '@src/util/web3React'
import localStore from '@src/redux/store'

export const Providers = ({ children }) => {
  return (
    <Web3ReactProvider getLibrary={getLibrary}>
        <Provider store={localStore}>
          {children}
        </Provider>
    </Web3ReactProvider>
  )
}

export default Providers
