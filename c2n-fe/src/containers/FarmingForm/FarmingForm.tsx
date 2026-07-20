import { useEffect, useState, useMemo } from "react";
import { InputNumber, Row, Col, Divider, Tabs, Modal, Spin } from "antd";
const { TabPane } = Tabs;
import Router from 'next/router'
import TransactionButton from "@src/components/elements/TransactionButton";
import { useAppDispatch } from "../../redux/hooks";
import { formatEther, seperateNumWithComma } from "@src/util/index";
import { useWallet } from '@src/hooks/useWallet'
import { useStake } from '@src/hooks/useStake'
import { useMessage } from '@src/hooks/useMessage'
import { useResponsive } from '@src/hooks/useResponsive';

import styles from './FarmingForm.module.scss';
import { useErrorHandler } from "@src/hooks/useErrorHandler";
import AppPopover from "@src/components/elements/AppPopover";

type FarmingFormProps = {
  chainId,
  depositTokenAddress,
  earnedTokenAddress,
  stakingAddress,
  poolId,
  available,
  depositSymbol,
  earnedSymbol,
  title,
  depositLogo,
  earnedLogo,
  getLptHref,
  aprRate,
  aprUrl
}

export default function FarmingForm(props: FarmingFormProps) {

  const [depositNum, setDepositNum] = useState<number>();
  const [withdrawNum, setWithdrawNum] = useState<number>();
  const [poolInfo, setPoolInfo] = useState<any>(null);
  const [formVisible, setFormVisible] = useState<boolean>(false);
  let poolInfoTimer = null;
  const [apr] = useState<any>('**');

  const {
    depositedAmount,
    earnedBre,
    balance,
    approve,
    deposit,
    withdraw,
    updateBalanceInfo,
    stakingContract,
    viewStakingContract,
    setDepositTokenAddress,
    setStakingAddress,
    setAllowanceAddress,
    setPoolId,
  } = useStake();

  const depositSymbol = props.depositSymbol;
  const earnedSymbol = props.earnedSymbol;

  const {
    setSuccessMessage,
    setErrorMessage,
  } = useMessage()

  const {
    getErrorMessage,
  } = useErrorHandler();

  const {
    isDesktopOrLaptop,
  } = useResponsive();

  // TODO: modify pool id
  const poolId = props.poolId;

  const {
    signer,
    chain,
    switchNetwork,
  } = useWallet();

  useEffect(() => {
    setPoolId(props.poolId);
  }, []);

  useEffect(() => {
    if (!stakingContract) {
      clearInterval(poolInfoTimer);
      return;
    }
    clearInterval(poolInfoTimer);
    /**
     * 获取farm池子信息
     */
    const schedule = () => {
      getPoolInfo(poolId);
      updateBalanceInfo();
    }

    schedule();
    poolInfoTimer = setInterval(() => schedule, 20000);

    return () => {
      clearInterval(poolInfoTimer);
    }
  }, [stakingContract])

  const totalDeposits = useMemo(() => {
    if (poolInfo) {
      return poolInfo.totalDeposits || 0;
    } else {
      return 0;
    }
  }, [poolInfo])

  const secondsPerYear = 60 * 60 * 24 * 365;

  const isChainAvailable = useMemo(() => {
    return chain?.chainId == props.chainId;
  }, [chain])

  useEffect(() => {
    if (isChainAvailable) {
      setDepositTokenAddress(props.depositTokenAddress);
    } else {
      clearInterval(poolInfoTimer);
    }
  }, [isChainAvailable, chain]);

  useEffect(() => {
    updateContracts();
  }, [signer, chain]);

  useEffect(() => {
    getPoolInfo(poolId);
  }, [depositedAmount]);


  /**
   * update staking contracts according to signer/chain
   */
  function updateContracts() {
    if (chain?.chainId != props.chainId || !signer) {
      // clear contracts
      setStakingAddress('');
      setAllowanceAddress('');
      return;
    }
    if (props.stakingAddress) {
      setStakingAddress(props.stakingAddress);
      setAllowanceAddress(props.stakingAddress);
    }
  }

  async function getPoolInfo(poolId) {
    if (!viewStakingContract) {
      return Promise.reject();
    }
    try {
      const ret =
        viewStakingContract.poolInfo &&
        (await viewStakingContract.poolInfo(poolId));
      setPoolInfo(ret);
    } catch (e) {
      console.error(e);
    }
  }


  /**
   * on stake button click
   */
  async function onStakeButtonClick() {
    if (depositNum == 0) {
      return;
    }
    await updateBalanceInfo();
    if (depositNum > formatEther(balance)) {
      setErrorMessage(`Not enough ${depositSymbol} to stake!`);
      return;
    }
    return approve(props.stakingAddress, depositNum)
      .then((txHash) => {
        return deposit(poolId, depositNum)
          .then((transaction) => transaction.wait())
          .then(() => {
            setSuccessMessage('Congratulations, you have successfully deposited ' + depositNum + ' ' + depositSymbol);
            setDepositNum(0);
            updateBalanceInfo();
          })
      })
      .catch((e) => {
        console.error(e);
        let msg = getErrorMessage(e);
        // FIXME: error of object cannot catch, hence handle string here.
        if (typeof e === 'string' && e.indexOf('ERC20: transfer amount exceeds allowance') > -1) {
          msg = 'Approve amount should be greater than staking amount!';
        }
        setErrorMessage('Stake failed. ' + (msg || ''));
        updateBalanceInfo();
      })
  }

  function onWithdrawButtonClick() {
    return withdraw(poolId, withdrawNum)
      .then((transaction) => transaction.wait())
      .then(() => {
        setSuccessMessage('Withdraw success!');
        setWithdrawNum(0);
        updateBalanceInfo();
      })
      .catch((e) => {
        console.error(e);
        let msg = getErrorMessage(e);
        setErrorMessage('Withdraw failed. ' + (msg || ''));
      })
  }

  function onHarvestButtonClick() {
    return withdraw(poolId, 0)
      .then((transaction) => {
        return transaction.wait();
      })
      .then(() => {
        setSuccessMessage('Harvest success!');
        updateBalanceInfo();
      })
      .catch((e) => {
        console.error(e);
        let msg = getErrorMessage(e);
        setErrorMessage('Harvest failed. ' + (msg || ''));
      })
  }

  const earnedBreInEther: number = formatEther(earnedBre);
  const depositedAmountInEther: number = formatEther(depositedAmount, 4)?.toFixed(4) || 0;

  function maxNumber(num) {
    return num > 0.01 ? num - 0.01 : num;
  }

  const checkValid = (props.depositTokenAddress &&
    props.earnedTokenAddress &&
    props.stakingAddress);

  return (
    <div>
      {/* deposit form */}
      <Modal open={formVisible} title={null} footer={null} onCancel={() => { setFormVisible(false) }}>
        <Tabs className={styles['modal']} type="card"
          items={[{
            label: 'Stake',
            key: '1',
            children: <Row justify="space-between" gutter={[16, 16]}>
              <Col span={isDesktopOrLaptop ? 24 : 24}>
                <Row justify="space-between">
                  <div className="balance">
                    {
                      stakingContract ?
                        <>Balance: {formatEther(balance, 4)?.toFixed(4)} {depositSymbol}</>
                        : <>Balance: -</>
                    }
                  </div>
                  <div className={styles['max']} onClick={() => setDepositNum(maxNumber(formatEther(balance)))}>MAX</div>
                </Row>
              </Col>
              <Col span={isDesktopOrLaptop ? 24 : 24}>
                <div className={styles['input']}>
                  <InputNumber
                    className={styles['number']}
                    value={depositNum}
                    max={formatEther(balance, 4)}
                    step="0.0001"
                    onChange={value => setDepositNum(value > 0 ? value : '')}
                    stringMode
                    controls={false}
                    bordered={false}
                  />
                  <div className={styles['unit']}>{depositSymbol}</div>
                </div>
              </Col>
              <Col span={isDesktopOrLaptop ? 24 : 24}>
                {
                  props.available ?
                    (
                      <TransactionButton
                        className={styles['button']}
                        onClick={onStakeButtonClick}
                        loadingText="staking"
                        noConnectText={'Connect wallet to stake'}
                        requiredChainId={props.chainId}
                        switchNetworkText={'Switch network to stake'}
                        style={{ width: '100%' }}
                      >
                        Stake
                      </TransactionButton>)
                    : (
                      <AppPopover content={'Coming soon'} wrap={true}>
                        <TransactionButton
                          className={[styles['button'], styles['disabled']].join(' ')}
                          disabled={true}
                          onClick={() => { }}
                          requiredChainId={props.chainId}
                          switchNetworkText={'Switch network to stake'}
                          noConnectText={'Connect wallet to stake'}
                          style={{ width: '100%' }}
                        >
                          Stake
                        </TransactionButton>
                      </AppPopover>
                    )
                }
              </Col>
            </Row>
          },
          {
            label: 'Claim',
            key: '2',
            children:
              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <div style={{ textAlign: 'center', fontSize: '1.6em' }}>Reward</div>
                </Col>
                <Col span={24}>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '1.2em' }}>{earnedBre === null ? <Spin /> : earnedBreInEther} {earnedSymbol}</span>
                  </div>
                </Col>
                <Col span={isDesktopOrLaptop ? 24 : 24}>
                  {
                    props.available ?
                      (<TransactionButton
                        className={styles['button']}
                        onClick={onHarvestButtonClick}
                        noConnectText={'Connect wallet to withdraw'}
                        style={{ width: '100%' }}
                        loadingText="claiming"
                      >
                        Claim
                      </TransactionButton>)
                      : (
                        <AppPopover content={'Coming soon'} wrap={true}>
                          <TransactionButton
                            className={[styles['button'], styles['disabled']].join(' ')}
                            disabled={true}
                            onClick={() => { }}
                            noConnectText={'Connect wallet to claim'}
                            style={{ width: '100%' }}
                          >
                            Claim
                          </TransactionButton>
                        </AppPopover>
                      )
                  }
                </Col>
              </Row>
          }, {
            label: 'Unstake',
            key: '3',
            children: <Row gutter={[16, 16]}>
              <Col span={isDesktopOrLaptop ? 24 : 24}>
                <Row justify="space-between">
                  {
                    stakingContract
                      ? <>
                        <div className="balance">Balance: {formatEther(depositedAmount, 4)?.toFixed(4)} {depositSymbol}</div>
                      </>
                      : <>
                        <div className="balance">Balance: -</div>
                      </>
                  }
                  <div className={styles['max']} onClick={() => setWithdrawNum(maxNumber(formatEther(depositedAmount, 4)))}>MAX</div>
                </Row>
              </Col>
              <Col span={isDesktopOrLaptop ? 24 : 24}>
                <div className={styles['input']}>
                  <InputNumber
                    className={styles['number']}
                    value={withdrawNum}
                    max={formatEther(depositedAmount, 4)}
                    step="0.0001"
                    onChange={value => setWithdrawNum(value > 0 ? value : '')}
                    stringMode
                    controls={false}
                    bordered={false}
                  />
                  <div className={styles['unit']}>{depositSymbol}</div>
                </div>
              </Col>
              <Col span={isDesktopOrLaptop ? 24 : 24}>
                {
                  props.available ?
                    (<TransactionButton
                      className={styles['button']}
                      onClick={onWithdrawButtonClick}
                      loadingText="withdrawing"
                      noConnectText={'Connect wallet to withdraw'}
                      style={{ width: '100%' }}
                    >
                      Unstake
                    </TransactionButton>)
                    : (
                      <AppPopover content={'Coming soon'} wrap={true}>
                        <TransactionButton
                          className={[styles['button'], styles['disabled']].join(' ')}
                          disabled={true}
                          onClick={() => { }}
                          noConnectText={'Connect wallet to unstake'}
                          style={{ width: '100%' }}
                        >
                          Unstake
                        </TransactionButton>
                      </AppPopover>
                    )
                }
              </Col>
            </Row>
          }]} />
      </Modal>
      <div className={styles['farming-card']}>
        {/* Disable in wrong network */}
        {
          isChainAvailable
            ? <></>
            : (<div className={styles['mask']} onClick={() => {
              switchNetwork(props.chainId)
            }}>
            </div>)
        }
        <section className={styles['container']}>
          <Row className={styles['container-title']} align="middle" justify="start">
            &nbsp;
            {props.title}
          </Row>
          <Divider style={{ margin: '0' }}></Divider>
          <Row className={styles['apy']} justify="center">
            {apr === null ? <Spin /> : <>{apr || '-'} %</>}
          </Row>
          <Row className={styles['apy-extra']} justify="center">
            APR
          </Row>
          <div className={styles['records']}>
            <Row className={styles['record']} justify="space-between">
              <Col className={styles['record-label']}>
                Earned
              </Col>
              <Col className={styles['record-value']}>
                {earnedSymbol}
              </Col>
            </Row>
            <Row className={styles['record']} justify="space-between">
              <Col className={styles['record-label']}>
                Total staked
              </Col>
              <Col className={styles['record-value']}>
                {poolInfo === null ? <Spin /> : seperateNumWithComma(formatEther(totalDeposits))} {depositSymbol}
              </Col>
            </Row>
            <Row className={styles['record']} justify="space-between">
              <Col className={styles['record-label']}>
                My staked
              </Col>
              <Col className={styles['record-value']}>
                {depositedAmount === null ? <Spin /> : depositedAmountInEther} {depositSymbol}
              </Col>
            </Row>
            <Row className={styles['record']} justify="space-between">
              <Col className={styles['record-label']}>
                Available
              </Col>
              <Col className={styles['record-value']}>
                {balance === null ? <Spin /> : (formatEther(balance, 4)?.toFixed(4) || 0)} {depositSymbol}
              </Col>
            </Row>
          </div>
          <Row>
            <TransactionButton
              className={[styles['button'], !checkValid && styles['disabled']].join(' ')}
              disabled={!checkValid}
              onClick={() => setFormVisible(true)}
              noConnectText={'Connect wallet to stake'}
              disabledText="Address not available"
              style={{ width: '100%' }}
            >
              Stake
            </TransactionButton>
          </Row>
          <Row className={styles['record']} justify="space-between">
            <Col className={styles['record-label']}>
              Rewards
            </Col>
            <Col className={styles['record-value']}>
              {earnedBre === null ? <Spin /> : earnedBreInEther} {earnedSymbol} &nbsp;
              {checkValid && <span
                onClick={() => { props.available && setFormVisible(true) }}
                className={styles['link']}
                style={{ background: '#DEDEDE', color: '#707070' }}
              >
                Claim
              </span>}
            </Col>
          </Row>
          <Row className={styles['record']} justify="space-between">
            <Col className={styles['record-label']}>
              {props.title}
            </Col>
            <Col className={styles['record-value']}>
              <span onClick={() => { Router.push('/') }}
                className={styles['link']}
                style={{ background: '#D9EE77' }}
              >
                GET {depositSymbol}
              </span>
            </Col>
          </Row>
        </section>
      </div>
    </div>
  );
}
