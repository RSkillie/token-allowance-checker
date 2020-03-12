import React, {useEffect} from 'react'
import {AllowanceId, fetchAllowanceValueThunk, QueryStates} from './AllowancesListSlice'
import {useDispatch, useSelector} from 'react-redux'
import {RootState} from 'app/rootReducer'
import {Loader, Table} from 'semantic-ui-react'
import AddressDisplay from 'components/AddressDisplay'
import bnToDisplayString from '@triplespeeder/bn2string'
import BN from 'bn.js'
import TokenAllowanceItemActions from './TokenAllowanceItemActions'

interface TokenAllowanceItemProps {
    allowanceId: AllowanceId
}

const unlimitedAllowance = new BN(2).pow(new BN(256)).subn(1)

const TokenAllowanceItem = ({allowanceId}:TokenAllowanceItemProps) => {
    const dispatch = useDispatch()
    const allowance       = useSelector((state:RootState) => state.allowances.allowancesById[allowanceId])
    const allowanceValue  = useSelector((state:RootState) => state.allowances.allowanceValuesById[allowanceId])
    const tokenContract   = useSelector((state:RootState) => state.tokenContracts.contractsById[allowance.tokenContractId])

    // lazy-load allowance value
    useEffect(()=>{
        if (allowanceValue.state === QueryStates.QUERY_STATE_INITIAL) {
            dispatch(fetchAllowanceValueThunk(allowanceId))
        }
    }, [allowanceValue, allowanceId])

    let allowanceElement, criticalAllowance
    switch(allowanceValue.state) {
        case QueryStates.QUERY_STATE_RUNNING:
            allowanceElement = <Loader active inline size={'mini'}/>
            break
        case QueryStates.QUERY_STATE_COMPLETE:
            criticalAllowance = (allowanceValue.value.eq(unlimitedAllowance)) || (allowanceValue.value.gte(tokenContract.totalSupply))
            if (criticalAllowance) {
                allowanceElement = <em>unlimited</em>
            } else {
                const roundToDecimals = new BN('2')
                const {precise, rounded} = bnToDisplayString({
                    value: allowanceValue.value,
                    decimals: tokenContract.decimals,
                    roundToDecimals
                })
                allowanceElement = <span>{rounded}</span>
            }
            break
        case QueryStates.QUERY_STATE_ERROR:
            allowanceElement = <span>error</span>
            break
        case QueryStates.QUERY_STATE_INITIAL:
        default:
            allowanceElement = ''
    }

    return (
        <Table.Row key={`${allowanceId}`}>
            <Table.Cell>
                <AddressDisplay addressId={allowance.spenderId}/>
            </Table.Cell>
            <Table.Cell negative={criticalAllowance}>
                {allowanceElement}
            </Table.Cell>
            <Table.Cell>
                <TokenAllowanceItemActions allowanceId={allowanceId}/>
            </Table.Cell>
        </Table.Row>
    )
}

export default TokenAllowanceItem