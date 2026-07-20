import { useEffect, useState, useMemo, useCallback } from 'react';
import { Modal, Row, Col, InputNumber } from 'antd';
import BasicButton from '@src/components/elements/Button.Basic';
import { useWallet } from '@src/hooks/useWallet';
import { formatEther } from "@src/util/index"
import { BigNumber } from '@ethersproject/bignumber';

import styles from './ParticipateModal.module.scss'
import AppPopover from '@src/components/elements/AppPopover';

export default function ParticipateModal(props) {
  const {
    loading,
  } = useWallet();
  const data = props.data || {};
  const [eth, setEth] = useState<any>(0);
  const [bre, setBre] = useState<any>(10);
  const [max, setMax] = useState<any>(props.allocationTop);

  const tokenPriceInPT = formatEther(props.tokenPriceInPT, 18);

  // 最多购买的数量
  const allocationTop = useMemo(() => {
    return data.allocationTop;
  }, [data])

  const decimals = useMemo(() => {
    return data.paymentTokenDecimal;
  }, [data])

  const calEth = useCallback((breValue) => {
    let eth;
    try {
      eth = formatEther(BigNumber.from((breValue)).mul(Math.pow(10, 18 - decimals)).mul(data.tokenPriceInPT || 1), 8);
    } catch (e) {
      eth = 0;
    }
    return eth?.toFixed(8) || '';
  }, [props.tokenPriceInPT]);

  useEffect(() => {
    if (allocationTop) {
      setBre(bre);
      setMax(allocationTop);
      setEth(calEth(bre));
    }
  }, [allocationTop, decimals, calEth]);

  function handleInputChange(value) {
    let bre = value;
    setBre(bre);
    setEth(calEth(bre));
  }

  function handleOk() {
    props.handleOk({ value: bre });
  }
  const disabled = bre > max || bre < 1;

  return (
    <Modal
      title={null}
      width={732}
      open={props.visible}
      onOk={handleOk}
      onCancel={props.handleCancel}
      okText={'Purchase'}
      footer={null}
      className={styles['modal']}
    >
      <h2 className={styles['title']}>
        Purchase
      </h2>
      <Row>
        <p className={styles['desc']}>
          Buy your {data.tokenName} ({data.symbol}) tokens with no extra fee, you can purchase with a maximum of {'\u00a0'}
          <AppPopover content={max}><span className={styles['maximum']}>{max}</span> {data.symbol || ''}</AppPopover>. {'\u00a0'}
          Make sure to confirm the transaction in your wallet and wait for it to confirm on-chain.
        </p>
      </Row>
      <Row className={[styles['input']].join(' ')}>
        <Col span={2}>
          From:
        </Col>
        <Col span={20} offset={2} className={styles['from-input']}>
          <InputNumber
            className={styles['number']}
            min={'0'}
            value={eth}
            stringMode
            controls={false}
            disabled
          />
          <div className={styles['unit']}>
            {'ETH'}
          </div>
        </Col>
      </Row>


      <Row className={styles['input']}>
        <Col span={2}>
          To:
        </Col>
        <Col span={20} offset={2}>
          <AppPopover content={<>Max Amount {max} {data.symbol || ''}</>}>
            <InputNumber
              className={styles['number']}
              defaultValue={bre}
              min={'1'}
              max={max}
              value={bre}
              controls={false}
              onChange={handleInputChange}
              formatter={value => value.replace(/[^\d]/g, '')}
              parser={value => value.replace(/[^\d]/g, '')}
            />
            <div className={styles['unit']}>
              {data.symbol || ''}
            </div>
          </AppPopover>
        </Col>
      </Row>

      <Row>
        Max Amount: {max} {data.symbol || ''}
      </Row>
      <Row>
        Current Price: {tokenPriceInPT} ETH / {data.symbol || ''}
      </Row>

      <Row justify="end" style={{ marginTop: '35px' }}>
        <BasicButton
          style={{
            width: '212px',
            height: '54px',
            backgroundColor: '#DEDEDE',
            backgroundImage: 'none',
            marginRight: '20px',
            color: '#505050',
            fontSize: '20px',
          }}
          onClick={props.handleCancel}>
          Cancel
        </BasicButton>
        <BasicButton
          style={{
            width: '212px',
            height: '54px',
            fontSize: '20px',
            backgroundImage: disabled ? "" : 'linear-gradient(179deg, #4DCC8A 0%, #1EA152 100%)',
            backgroundColor: '#red',
          }}
          loading={loading}
          disabled={disabled}
          onClick={handleOk}
        >
          Purchase
        </BasicButton>
      </Row>
    </Modal>
  )
}