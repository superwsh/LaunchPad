import { useSwap } from "@src/hooks/useSwap";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { InputNumber, Row, Col, Select } from "antd";

import {
  BigNumber,
  Contract,
  ethers,
} from "ethers";
import {
  tokenAbi,
} from '@src/config'
import TransactionButton from "@src/components/elements/TransactionButton";
import { formatUnits } from "@src/util/index";
import { useWallet } from '@src/hooks/useWallet'
import { useMessage } from '@src/hooks/useMessage'

import styles from './SwapPage.module.scss';
import { usePair } from "@src/hooks/usePair";
export function InitPage({ tokenUnits }) {

  const {
    walletAddress,
    chain,
  } = useWallet();

  const {
    setSuccessMessage,
    setErrorMessage,
  } = useMessage()

  const {
    signer,
    pair,
    routerContract,
    token1Address,
    token2Address,
    setToken1Address,
    setToken2Address,
    getAllPairs,
    approveToRouter } = useSwap({noPairAlert: false});

  const [fromNum, setFromNum] = useState<number>();
  const [toNum, setToNum] = useState<number>();
  const waiting = useRef(false);
  const [fromUnitValue, setFromUnitValue] = useState<string>(tokenUnits[0].value);
  const [toUnit, setToUnit] = useState<string>(tokenUnits[1].value);
  const [exchangeStatus, setExchangeStatus] = useState(0);
  const [balance, setBalance] = useState(null);
  const [toBalance, setToBalance] = useState(null);
  const [decimals1, setDecimals1] = useState(18);
  const [decimals2, setDecimals2] = useState(18);

  const fromUnit = useMemo(() => {
    return tokenUnits.find(v => v.value === fromUnitValue);
  }, [fromUnitValue]);

  /**
   * 更新余额
   */
  useEffect(getToken1Balance, [token1Address, signer])
  useEffect(getToken2Balance, [token2Address, signer])

  /**
   * 更新token2的名字
   */
  useEffect(() => {
    if (fromUnitValue == toUnit) {
      let toUnitIndex = tokenUnits.findIndex(v => v.value === toUnit);
      setToUnit(toUnitIndex + 1 >= tokenUnits.length ? tokenUnits[0].value : tokenUnits[toUnitIndex + 1].value);
    }
  }, [fromUnitValue, toUnit])


  /**
   * 更新token1的地址
   */
  useEffect(() => {
    const tokenInfo = tokenUnits.find(v => v.value === fromUnitValue);
    if (tokenInfo.contractAddress && tokenInfo?.chainId === chain?.chainId) {
      setToken1Address(tokenInfo.contractAddress);
    } else {
      setToken1Address('');
    }
  }, [fromUnitValue, chain])


  /**
   * 更新token2的地址
   */
  useEffect(() => {
    const tokenInfo = tokenUnits.find(v => v.value === toUnit);
    if (tokenInfo.contractAddress && tokenInfo?.chainId == chain?.chainId) {
      setToken2Address(tokenInfo.contractAddress);
    } else {
      setToken2Address('');
    }
  }, [toUnit, chain])

  useEffect(() => {
    const tokenInfo = tokenUnits.find(v => v.chainId == chain?.chainId);
    if (tokenInfo) {
      setFromUnitValue(tokenInfo.value);
    }
  }, [chain])

  function getToken1Balance() {
    const contractAddress = fromUnit.contractAddress;
    if (contractAddress) {
      const tokenContract = new Contract(contractAddress, tokenAbi, signer);
      tokenContract.balanceOf(walletAddress)
        .then((result: BigNumber) => {
          setBalance(result);
        });

      tokenContract.decimals()
        .then((result: number) => {
          setDecimals1(result);
        });
    }
  }

  function getToken2Balance() {
    const toContractAddress = token2Address;
    if (toContractAddress) {
      const tokenContract = new Contract(toContractAddress, tokenAbi, signer);
      tokenContract.balanceOf(walletAddress)
        .then((result: BigNumber) => {
          setToBalance(result);
        });

      tokenContract.decimals()
        .then((result: number) => {
          setDecimals2(result);
        });
    }
  }

  const handleFromUnitChange = function (value) {
    if (value == toUnit) {
      setToUnit(fromUnitValue);
    }
    setFromUnitValue(value);
  }

  const handleToUnitChange = function (value) {
    if (value == fromUnitValue) {
      setFromUnitValue(toUnit);
    }
    setToUnit(value);
  }

  const onSwapButtonClick = useCallback(async () => {
    if (!fromNum || !toNum) {
      setErrorMessage(`Please input exchange token number`);
      return;
    }
    if(Number(toNum) === 0 || Number(fromNum) === 0) {
      setErrorMessage('流动性不足');
      return;
    }
    if(pair){
      setErrorMessage('已经存在该交易对');
      return;
    }
    try {
      setExchangeStatus(3); // Approving...
      const amountADesired = ethers.utils.parseUnits(fromNum.toString(), decimals1);
      const amountBDesired = ethers.utils.parseUnits(toNum.toString(), decimals2);
      /**
       * 用于控制滑点，这里设置为最多允许1%的滑点
       * 表示最多允许的因为滑点而产生的添加流动性的偏差是1% 添加值的最小值为指定添加的数量的99%
       */
      const amountAMin = amountADesired.mul(99).div(100); // 用于控制滑点，这里设置为最多允许1%的滑点
      const amountBMin = amountBDesired.mul(99).div(100);
      // 先approve
      const tx1 = await approveToRouter(token1Address, amountADesired);
      const tx2 = await approveToRouter(token2Address, amountBDesired);
      await Promise.all([tx1.wait(), tx2.wait()]);

      // swap调用
      setExchangeStatus(4); // Paying...
      const tx = await routerContract.addLiquidity(
        token1Address,
        token2Address,
        amountADesired,
        amountBDesired,
        amountAMin,
        amountBMin,
        walletAddress,
        Math.floor(Date.now() / 1000) + 60 * 10 // 设置超时时间
      );
      await tx.wait();
      setSuccessMessage('Init liquidity success');
    } catch (err) {
      console.log(err);
      setErrorMessage('Init liquidity failed');
    } finally {
      setExchangeStatus(0);
      getAllPairs();
      setFromNum(0);
      setToNum(0);
    }
  }, [fromNum, toNum, token1Address, token2Address,routerContract])

  const debouncedOnSwapButtonClick = () => {
    if (waiting.current) {
    } else {
      onSwapButtonClick();
      waiting.current = true;
      setTimeout(() => waiting.current = false, 2000);
    }
  };

  return (
    <div className={styles['bridge-form']}>
      {/* deposit form */}
      <section className={styles['section']}>
  <div>
    <h2 className={styles['title']}>
      <Row>
        <Col>
          <span>Init Liquidity</span>
        </Col>
      </Row>
    </h2>

      <div style={{marginBottom: '20px'}}>
        <div className="balance">Balance: {formatUnits(balance, 4, decimals1)?.toFixed(8)} {fromUnit.label}</div>


        <div className="balance">Balance: {formatUnits(toBalance, 4, decimals2)?.toFixed(8)} {toUnit}</div>
      </div>

    <Row gutter={[16, 16]}>
      <div className={styles['input']}>
        <InputNumber
          className={styles['number']}
          value={fromNum}
          max={formatUnits(balance, 4, decimals1)}
          step="0.0001"
          onChange={value => setFromNum(value)}
          stringMode
          controls={false}
          bordered={false}
        />
        <Select
          bordered={false}
          className={styles['unit']}
          value={fromUnitValue}
          options={tokenUnits}
          onChange={handleFromUnitChange}
        />
      </div>
        <div className={styles['input']} style={{marginBottom:'20px'}}>
          <InputNumber
            className={styles['number']}
            value={toNum}
            max={formatUnits(toBalance, 4, decimals2)}
            step="0.0001"
            stringMode
            min={0}
            controls={false}
            bordered={false}
            onChange={value => setToNum(value)}
            // disabled
          />
          <Select
            bordered={false}
            className={styles['unit']}
            value={toUnit}
            options={tokenUnits}
            onChange={handleToUnitChange}
          />
        </div>
      <TransactionButton
        className="button"
        onClick={debouncedOnSwapButtonClick}
        noConnectText={'Connect wallet to exchange'}
        style={{ width: '100%' }}
        loading={![0, 1].includes(exchangeStatus)}
        loadingText={exchangeStatus == 2 ? 'Waiting Tx...' : exchangeStatus == 3 ? 'Approving...' : exchangeStatus == 4 ? 'Paying...' : 'Please wait...'}
        requiredChainId={chain?.chainId}
        switchNetworkText={'Switch Network to Exchange'}
      >
        Init Liquidity
      </TransactionButton>
    </Row>
  </div>
  </section>
  </div>)
}