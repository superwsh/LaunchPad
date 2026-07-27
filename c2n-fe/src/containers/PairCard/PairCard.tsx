import { InputNumber, Row, Col, Divider, Tabs, Modal, Spin } from "antd";
import { formatEther, seperateNumWithComma } from "@src/util/index";

import styles from './PairCard.module.scss';
import { usePair } from "@src/hooks/usePair";
import { useEffect, useRef } from "react";

type PairCardProps = {
  pair: string;
  onSettingClick: () => void;
}

export default function PairCard({ pair, onSettingClick }: PairCardProps) {
  const { name, token1Symbol, token2Symbol, LPbalance, token1Balance, token2Balance, userToken1Reserve, userToken2Reserve } = usePair(pair);
 

  return (
    <div>
      <div className={styles['farming-card']}>
        <section className={styles['container']}>
          <Row className={styles['container-title']} align="middle" justify="start">
            &nbsp;{name}
          </Row>
          <Divider style={{ margin: '0' }}></Divider>
          <div className={styles['records']}>
            <Row className={styles['record']} justify="space-between">
              <Col className={styles['record-label']}>
                Pair
              </Col>
              <Col className={styles['record-value']}>
                {name}
              </Col>
            </Row>
            <Row className={styles['record']} justify="space-between">
              <Col className={styles['record-label']}>
                LP Token Amount
              </Col>
              <Col className={styles['record-value']}>
                {!token1Symbol || !token2Symbol ? <Spin /> : seperateNumWithComma(formatEther(LPbalance))}
              </Col>
            </Row>
            <Row className={styles['record']} justify="space-between">
              <Col className={styles['record-label']}>
                Balance {token1Symbol}
              </Col>
              <Col className={styles['record-value']}>
                {token1Balance === null ? <Spin /> : (formatEther(token1Balance, 4)?.toFixed(4) || 0)}
              </Col>
            </Row>
            <Row className={styles['record']} justify="space-between">
              <Col className={styles['record-label']}>
                Balance {token2Symbol}
              </Col>
              <Col className={styles['record-value']}>
                {token2Balance === null ? <Spin /> : (formatEther(token2Balance, 4)?.toFixed(4) || 0)}
              </Col>
            </Row>
            <Row className={styles['record']} justify="space-between">
              <Col className={styles['record-label']}>
                已存入{token1Symbol}
              </Col>
              <Col className={styles['record-value']}>
                {userToken1Reserve === null ? <Spin /> : (formatEther(userToken1Reserve, 4)?.toFixed(4) || 0)}
              </Col>
            </Row>
            <Row className={styles['record']} justify="space-between">
              <Col className={styles['record-label']}>
                已存入{token2Symbol}
              </Col>
              <Col className={styles['record-value']}>
                {userToken2Reserve === null ? <Spin /> : (formatEther(userToken2Reserve, 4)?.toFixed(4) || 0)}
              </Col>
            </Row>
          </div>
          <Row className={styles['record']} justify="space-between">
            <Col className={styles['record-label']}>
            </Col>
            <Col className={styles['record-value']}>
              <span
                onClick={onSettingClick}
                className={styles['link']}
                style={{ background: '#DEDEDE', color: '#707070' }}
              >
                Setting
              </span>
            </Col>
          </Row>
        </section>
      </div>
    </div>
  );
}
