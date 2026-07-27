import {  Row, Col, } from "antd";
import { useWallet } from '@src/hooks/useWallet'
import { useResponsive } from '@src/hooks/useResponsive';

import styles from './SwapPage.module.scss';
import { IconBridge } from '@src/components/icons'
import SwapConfig from "@src/config/swap";
import { InputForm } from "./InputForm";

export default function SwapPage(props: { available: boolean }) {

  const {
    isDesktopOrLaptop,
  } = useResponsive();

  // TODO: modify pool id
  // 0: bre pool 1: boba pool

  const {
    chain,
  } = useWallet();

  
  return (
      <div className={styles['bridge-form']}>
        {/* deposit form */}
        <section className={styles['section']}>
          <Row justify="space-between" gutter={[16, 16]}>
            <Col className={styles['container']} span={isDesktopOrLaptop ? 24 : 24}>
              <h2 className={styles['title']}>
                <Row justify="space-between">
                  <Col>
                    <IconBridge className={styles['title-logo']}></IconBridge>
                    <span style={{ marginLeft: '10px' }}>Swap</span>
                  </Col>
                  <Col>
                  </Col>
                </Row>
              </h2>
              {chain?.chainId && <InputForm tokenUnits={SwapConfig[chain?.chainId]} available={props.available}/>}
            </Col>
          </Row>
        </section>
      </div>
  );
}
