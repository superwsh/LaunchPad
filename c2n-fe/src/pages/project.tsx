import type { AppProps } from "next/app";
import Router from "next/router";
import {
  Row,
  Col,
  Statistic,
  message,
  Timeline,
  Modal,
  Input,
  Spin,
} from "antd";
import {
  QuestionCircleOutlined,
  InfoCircleOutlined,
  CopyOutlined,
} from "@ant-design/icons";
const { Countdown } = Statistic;

import { ProjectData, RegistrationData, SaleData } from "@src/types";
import { STAKING_POOL_ID, tokenAbi } from "@src/config";
import styles from "./project.module.scss";
import TransactionButton from "@src/components/elements/TransactionButton";
import PoolCard from "@src/components/elements/PoolCard";
import ParticipateModal from "@src/containers/ParticipateModal/ParticipateModal";
import { useEffect, useState, useMemo } from "react";
import {
  formatDate,
  hexToBytes,
  parseEther,
  formatEther,
  parseWei,
  seperateNumWithComma,
} from "@src/util/index";
import axios from "@src/api/axios";
import { useWallet } from "@src/hooks/useWallet";
import { usePageLoading } from "@src/hooks/usePageLoading";
import { useErrorHandler } from "@src/hooks/useErrorHandler";
import { useResponsive } from "@src/hooks/useResponsive";

import { BigNumber, ethers } from "ethers";

import { useMessage } from "../hooks/useMessage";
import { useStake } from "../hooks/useStake";
import { useThirdParty } from "../hooks/useThirdParty";
import AppPopover from "@src/components/elements/AppPopover";
import { WarningOutlined } from "@ant-design/icons";

// 根据质押的金额配置
const ALLOCATION_TOP = "1000000000000000000000";

/**
 * 实际业务中如果结合社交平台注册项目
 * 可以设计在登陆平台后才能参与项目
 * 这里默认社交平台已经注册成功
 */

/**
 * Pool detail page
 */
export default function Pool() {
  let search, params, pId;
  if (typeof window !== "undefined") {
    search = window.location.search;
    params = new URLSearchParams(search);
    pId = params.get("id");
  }

  const {
    walletAddress,
    addToken,
    saleContract,
    saleAddress,
    setSaleAddress,
    setLoading,
    chain,
  } = useWallet();

  const { setSuccessMessage, setErrorMessage } = useMessage();

  const {
    depositedAmount,
    setStakingAddress,
    approve,
    stakingContract,
    depositDecimals,
    depositSymbol,
    setAllowanceAddress,
    allowance,
    globalPoolStakingAddress,
    depositTokenContract,
    setDepositTokenAddress,
    globalPoolDepositTokenAddress,
  } = useStake();

  useEffect(() => {
    setStakingAddress(globalPoolStakingAddress);
  }, [globalPoolStakingAddress]);

  const { PageLoader, setPageLoading } = usePageLoading();

  const { getErrorMessage } = useErrorHandler();

  const { isDesktopOrLaptop } = useResponsive();

  const [projectInfo, setProjectInfo] = useState<ProjectData>(
    {} as ProjectData
  );
  const [tab, setTab] = useState("sale_info");
  // TODO: fix pool Id
  const [poolId] = useState<number>(STAKING_POOL_ID);
  const [statesReady, setStatesReady] = useState<boolean>(false);
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [isParticipated, setIsParticipated] = useState<boolean>(false);
  // const [participateAmount, setParticipateAmount] = useState();

  // 【这个放在后台中用作签名参数，后台用于校验购买是否超过最大限制】
  const [allocationTop] = useState(ALLOCATION_TOP);
  const [participateInfo, setParticipateInfo] = useState<any>();

  const [mileStones, setMileStones] = useState<any>({});

  // const [paymentTokenAddress, setPaymentTokenAddress] = useState<string>('');
  // const [paymentTokenDecimal, setPaymentTokenDecimal] = useState<number>(18);

  // status: -1:not ready, 0: not started, 1: in registration,
  // 2: after registration and before participation,
  // 3: in sale,
  // 4: sale ended,
  const [status, setStatus] = useState(-1);

  const [showParticipateModal, setShowParticipateModal] = useState(false);

  useThirdParty();

  const unImplementedInterfaceLog = (text) => {
    console.log("未实现的接口：", text);
  };

  useEffect(() => {
    setPageLoading(true);
    // get projects info
    axios
      .get("/boba/product/base_info", { params: { productId: pId } })
      .then((response) => {
        let data = response.data || {};
        data.chainId = chain.chainId;
        console.log("project info:", data);
        setProjectInfo(data);
      })
      .catch((e) => {
        setErrorMessage(
          "Network error, please check your network and refresh."
        );
      })
      .finally(() => {
        setPageLoading(false);
      });

    refreshStates();
  }, []);

  useEffect(() => {
    refreshStates();
  }, [saleContract, walletAddress]);

  const amountBought: BigNumber = useMemo(() => {
    return (
      (participateInfo && BigNumber.from(participateInfo[0] as string)) ||
      BigNumber.from(0)
    );
  }, [participateInfo]);

  const amountETHPaid: BigNumber = useMemo(() => {
    return (
      (participateInfo && BigNumber.from(participateInfo[1] as string)) ||
      BigNumber.from(0)
    );
  }, [participateInfo]);

  const timeParticipated: number = useMemo(() => {
    return (participateInfo && parseWei(participateInfo[2])) || 0;
  }, [participateInfo]);

  const isPortionWithdrawn: Array<boolean> = useMemo(() => {
    return (participateInfo && participateInfo[3]) || 0;
  }, [participateInfo]);

  // FIXME: should get vesting info from project api
  const vestingInfo = useMemo(() => {
    if (
      projectInfo &&
      projectInfo.vestingPercentPerPortion &&
      projectInfo.vestingPortionsUnlockTime
    ) {
      return [
        projectInfo.vestingPercentPerPortion,
        projectInfo.vestingPortionsUnlockTime,
      ];
    } else {
      return [[], []];
    }
  }, [projectInfo]);

  const vestingPercentPerPortion: Array<number> = useMemo(() => {
    return (vestingInfo && vestingInfo[0]) || [];
  }, [vestingInfo]);

  const vestingPortionsUnlockTime: Array<number> = useMemo(() => {
    return (vestingInfo && vestingInfo[1]) || [];
  }, [vestingInfo]);
  const canWithdrawArr: Array<boolean> = useMemo(() => {
    if (vestingPortionsUnlockTime && isPortionWithdrawn) {
      return isPortionWithdrawn.map((canWithdraw, index) => {
        return (
          !canWithdraw &&
          (vestingPortionsUnlockTime[index] || "0" + "000") <= Date.now() + ""
        );
      });
    } else if (isPortionWithdrawn) {
      return isPortionWithdrawn.map((v) => !v);
    } else {
      return [true];
    }
  }, [isPortionWithdrawn, status]);

  useEffect(() => {
    const bigNumSec2Milsec = (bigSec) => {
      return (bigSec && BigNumber.from(bigSec).toString()) || "";
    };
    if (projectInfo) {
      // init sale contract
      setSaleAddress(projectInfo.saleContractAddress);

      const mileStones = {
        registrationTimeStarts: bigNumSec2Milsec(
          projectInfo.registrationTimeStarts
        ),
        registrationTimeEnds: bigNumSec2Milsec(
          projectInfo.registrationTimeEnds
        ),
        saleStart: bigNumSec2Milsec(projectInfo.saleStart),
        saleEnd: bigNumSec2Milsec(projectInfo.saleEnd),
        unlock: bigNumSec2Milsec(projectInfo.unlockTime),
      };
      setMileStones(mileStones);
      setStatus(projectInfo.status);
      // 默认是C2N-Token
      setDepositTokenAddress(globalPoolDepositTokenAddress);
    }
  }, [projectInfo]);

  useEffect(() => {
    const timer = setInterval(() => {
      judgePoolStatus();
    }, 1000);
    return () => clearInterval(timer);
  }, [mileStones]);

  useEffect(() => {
    setAllowanceAddress(saleAddress);
  }, [saleAddress]);

  function judgePoolStatus() {
    const now = Date.now();
    if (!mileStones) {
      return;
    }
    if (now < mileStones.registrationTimeStarts) {
      // not started
      setStatus(0);
    } else if (now < mileStones.registrationTimeEnds) {
      // in registration
      setStatus(1);
    } else if (now < mileStones.saleStart) {
      // before sale
      setStatus(2);
    } else if (now < mileStones.saleEnd) {
      // in sale
      setStatus(3);
    } else if (now < mileStones.unlock) {
      // sale ends
      setStatus(4);
    } else if (now >= mileStones.unlock) {
      // sale ends and unlock(means can withdraw token)
      setStatus(5);
    }
  }

  function refreshStates() {
    if (!saleContract || !walletAddress) {
      return;
    }
    let option = { gasLimit: 100000 };
    let promiseA = saleContract
      .isRegistered(walletAddress, option)
      .then((data) => {
        setIsRegistered(data);
      })
      .catch((e) => {
        console.error(e);
      });
    let promiseB = saleContract
      .isParticipated(walletAddress, option)
      .then((data) => {
        setIsParticipated(data);
        if (data) {
          getParticipateInfo();
        }
      })
      .catch((e) => {
        console.error(e);
      });
    Promise.all([promiseA, promiseB]).then(() => {
      setStatesReady(true);
    });
  }

  /**
   *
   * @returns Promise<string> - registration sign
   */
  function getRegistrationSign() {
    console.log("getRegis-------");
    const f = new FormData();
    f.append("userAddress", walletAddress || "");
    f.append("contractAddress", saleAddress);

    return axios
      .post("/boba/encode/sign_registration", f)
      .then((response) => {
        let data = response.data;
        console.log(data, "sign_registration_data");
        return data;
      })
      .catch((e) => {
        // handle request error
        console.error(e);
        setErrorMessage("Register fail");
      });
  }
  /**
   *
   * @returns Promise<string> - participate sign
   */
  function getParticipateSign() {
    const NUMBER_1E18 = "1000000000000000000";

    const f = new FormData();
    f.append("userAddress", walletAddress || "");
    f.append("contractAddress", saleAddress);
    // FIXME: get Participate amount
    f.append("amount", allocationTop);
    return axios
      .post("/boba/encode/sign_participation", f)
      .then((response) => {
        let data = response.data;
        console.log(data, "sign ---------");
        return data;
      })
      .catch((e) => {
        // handle request error
        console.error(e);
        setErrorMessage("Purchase fail");
      });
  }
  /**
   * Register
   * @returns Promise
   */
  function registerForSale() {
    if (!saleContract) {
      return Promise.reject();
    }
    return getRegistrationSign()
      .then((registrationSign) => {
        console.log(registrationSign, "sign");
        const signBuffer = hexToBytes(registrationSign);
        return saleContract
          .registerForSale(signBuffer, poolId)
          .then((transaction) => {
            return transaction.wait();
          })
          .then(() => {
            setSuccessMessage("Register success");
            refreshStates();
            return Promise.resolve();
          });
      })
      .catch((e) => {
        setErrorMessage("Participate failed. " + (getErrorMessage(e) || ""));
        console.error(e);
      });
  }
  /**
   * Participate project
   * @returns Promise
   */
  async function participate(value) {
    console.log(value, "val ---------------");
    if (!saleContract) {
      return Promise.reject();
    }
    setLoading(true);
    const decimals = await depositTokenContract.decimals();
    const paymentAmount = BigNumber.from(projectInfo.tokenPriceInPT)
      .mul(~~value.value)
      .div(Math.pow(10, 18 - decimals));
    /**
     * 购买代币
     * 设置足够的代币授权，后面在withdraw时，会自动扣除相应的代币
     */
    return approve(
      saleAddress,
      Number(ethers.utils.formatUnits(paymentAmount, depositDecimals)),
      depositDecimals
    )
      .then(getParticipateSign)
      .then(async (participateSign) => {
        const signBuffer = hexToBytes(participateSign);
        // get participation value
        const options = {
          value: paymentAmount,
        };
        console.log(
          {
            allocationTop,
            paymentAmount: paymentAmount.toString(),
            saleAddress: projectInfo.saleContractAddress,
            options,
            bg: BigNumber.from(allocationTop + ""),
          },
          "params---------"
        );

        return saleContract
          .participate(signBuffer, BigNumber.from(allocationTop + ""), options)
          .then((transaction) => {
            return transaction.wait();
          })
          .then((transaction) => {
            setSuccessMessage("Purchase success");
            refreshStates();
            setShowParticipateModal(false);
            return Promise.resolve();
          });
      })
      .catch((e) => {
        console.error(e);
        let msg = getErrorMessage(e);
        setErrorMessage("Purchase fail. " + (msg || ""));
        return;
      })
      .finally(() => {
        setLoading(false);
      });
  }

  function withdrawTokens() {
    if (!saleContract) {
      return Promise.reject();
    }
    // set protionId
    let portionIds = canWithdrawArr
      .map((canWithdraw, index) => {
        return canWithdraw ? index : -1;
      })
      .filter((v) => v > -1);

    return saleContract
      .withdrawMultiplePortions(portionIds)
      .then((tx) => tx.wait())
      .then((tx) => {
        setSuccessMessage("withdraw success");
        refreshStates();
        return Promise.resolve();
      })
      .catch((e) => {
        let msg = getErrorMessage(e);
        setErrorMessage("Withdraw fail. " + (msg || ""));
      });
  }

  function getParticipateInfo() {
    if (!saleContract) {
      return Promise.reject;
    }
    let option = {};
    return saleContract
      .getParticipation(walletAddress, option)
      .then((data) => {
        return setParticipateInfo(data);
      })
      .catch((e) => {
        setErrorMessage(
          "Get participation info fail, please check your network and refresh!"
        );
        console.error(e);
      });
  }
  const SaleInfo = (
    <div className={styles["sale-info"] || ""}>
      <Row className={styles["row"]}>
        <Col span={isDesktopOrLaptop ? 12 : 24} className={styles["label"]}>
          {" "}
          Project Website{" "}
        </Col>
        <Col span={isDesktopOrLaptop ? 12 : 24} className={styles["value"]}>
          <a href={projectInfo.projectWebsite} target="_blank" rel="noreferrer">
            {projectInfo.projectWebsite}
          </a>
        </Col>
      </Row>
      <Row className={styles["row"]}>
        <Col span={isDesktopOrLaptop ? 12 : 24} className={styles["label"]}>
          {" "}
          Number of Registrations{" "}
        </Col>
        <Col span={isDesktopOrLaptop ? 12 : 24} className={styles["value"]}>
          {projectInfo.numberOfRegistrants}
        </Col>
      </Row>
      <Row className={styles["row"]}>
        <Col span={isDesktopOrLaptop ? 12 : 24} className={styles["label"]}>
          {" "}
          Vesting{" "}
        </Col>
        <Col span={isDesktopOrLaptop ? 12 : 24} className={styles["value"]}>
          {projectInfo.vesting ?? "~"}
        </Col>
      </Row>
      <Row className={styles["row"]}>
        <Col span={isDesktopOrLaptop ? 12 : 24} className={styles["label"]}>
          {" "}
          TGE{" "}
        </Col>
        <Col span={isDesktopOrLaptop ? 12 : 24} className={styles["value"]}>
          {formatDate(projectInfo.tge, "HH:mm, Month DD, YYYY")}
        </Col>
      </Row>
      <Row className={styles["row"]}>
        <Col span={isDesktopOrLaptop ? 12 : 24} className={styles["label"]}>
          {" "}
          Sale Contract Address{" "}
        </Col>
        <Col span={isDesktopOrLaptop ? 12 : 24} className={styles["value"]}>
          {projectInfo?.saleContractAddress || ""}
        </Col>
      </Row>
    </div>
  );
  const TokenInfo = (
    <div className={styles["token-info"] || ""}>
      <Row className={styles["row"]}>
        <Col span={isDesktopOrLaptop ? 12 : 24} className={styles["label"]}>
          {" "}
          Token Name{" "}
        </Col>
        <Col span={isDesktopOrLaptop ? 12 : 24} className={styles["value"]}>
          {projectInfo.tokenName}
        </Col>
      </Row>
      <Row className={styles["row"]}>
        <Col span={isDesktopOrLaptop ? 12 : 24} className={styles["label"]}>
          {" "}
          Token Symbol
        </Col>
        <Col span={isDesktopOrLaptop ? 12 : 24} className={styles["value"]}>
          {projectInfo.symbol}
        </Col>
      </Row>
      <Row className={styles["row"]}>
        <Col span={isDesktopOrLaptop ? 12 : 24} className={styles["label"]}>
          {" "}
          Token Decimals{" "}
        </Col>
        <Col span={isDesktopOrLaptop ? 12 : 24} className={styles["value"]}>
          {projectInfo.decimals}
        </Col>
      </Row>
      <Row className={styles["row"]}>
        <Col span={isDesktopOrLaptop ? 12 : 24} className={styles["label"]}>
          {" "}
          IDO Total Supply{" "}
        </Col>
        <Col span={isDesktopOrLaptop ? 12 : 24} className={styles["value"]}>
          {projectInfo &&
            seperateNumWithComma(+projectInfo.amountOfTokensToSell)}
        </Col>
      </Row>
      <Row className={styles["row"]}>
        <Col span={isDesktopOrLaptop ? 12 : 24} className={styles["label"]}>
          {" "}
          Token Address{" "}
        </Col>
        <Col span={isDesktopOrLaptop ? 12 : 24} className={styles["value"]}>
          {projectInfo?.tokenAddress || ""}
        </Col>
      </Row>
    </div>
  );

  const alloTable = (
    <>
      {isRegistered ? (
        <div className={styles["allocation-info"]}>
          {/* visible after registration */}
          <Row className={styles["row"]}>
            <Col span={isDesktopOrLaptop ? 12 : 24} className={styles["label"]}>
              My Allocation
              <AppPopover
                content={
                  <div style={{ width: "300px" }}>
                    Your allocations could be changed during the registration
                    period, and the final allocations will be fixed when the
                    registration ends. You can always add staking tokens to
                    increase your allocations during the registration time.
                  </div>
                }
              >
                <QuestionCircleOutlined
                  style={{
                    marginLeft: "10px",
                    color: "#FFB852",
                    cursor: "pointer",
                  }}
                />
              </AppPopover>
            </Col>
            <Col span={isDesktopOrLaptop ? 12 : 24} className={styles["value"]}>
              {!allocationTop || (allocationTop as any) == 0 ? (
                <>
                  <Spin style={{ verticalAlign: "text-bottom" }}></Spin>{" "}
                  <span>Calculating...</span>
                </>
              ) : (
                <>
                  {seperateNumWithComma(formatEther(allocationTop, 2))}{" "}
                  {projectInfo.symbol}
                </>
              )}
            </Col>
          </Row>
          {/* visible after participation */}
          {isParticipated && !!participateInfo ? (
            <>
              <Row className={styles["row"]}>
                <Col
                  span={isDesktopOrLaptop ? 12 : 24}
                  className={styles["label"]}
                >
                  My Participation
                </Col>
                <Col
                  span={isDesktopOrLaptop ? 12 : 24}
                  className={styles["value"]}
                >
                  <AppPopover
                    content={<>{formatEther(amountETHPaid).toFixed(2)} ETH</>}
                  >
                    {seperateNumWithComma(formatEther(amountBought, 2))}{" "}
                    {projectInfo.symbol}
                  </AppPopover>
                </Col>
              </Row>
              <Row className={styles["row"]}>
                <Col
                  span={isDesktopOrLaptop ? 12 : 24}
                  className={styles["label"]}
                >
                  {" "}
                  Purchase Time{" "}
                </Col>
                <Col
                  span={isDesktopOrLaptop ? 12 : 24}
                  className={styles["value"]}
                >
                  {formatDate(timeParticipated + "000", "YYYY-MM-DD HH:mm:ss")}
                </Col>
              </Row>
            </>
          ) : (
            <></>
          )}
        </div>
      ) : (
        <>
          <Row className={styles["row"]} justify="center" align="middle">
            <WarningOutlined
              style={{ color: "red", fontSize: "32px", marginRight: "15px" }}
            />
            <div style={{ whiteSpace: "nowrap", lineHeight: "50px" }}>
              You need to participate to check your allocation.
            </div>
          </Row>
        </>
      )}
    </>
  );

  const getTabInfo = () => {
    switch (tab) {
      case "token_info":
        return TokenInfo;
      case "about":
        return (
          <>
            <div
              className={styles["about"]}
              dangerouslySetInnerHTML={{ __html: projectInfo.aboutHtml || "" }}
            ></div>
          </>
        );
      case "allocations":
        return alloTable;
      case "sale_info":
      default:
        return SaleInfo;
    }
  };
  const getActionButton = () => {
    if (projectInfo.type == 1) {
    }
    // no contract in this chain
    if (chain && chain.chainId != projectInfo.chainId) {
      return (
        <TransactionButton
          noConnectText={"Connect wallet to stake"}
          className={"button " + styles["register-button"]}
          requiredChainId={projectInfo.chainId}
          switchNetworkText={"Switch Network"}
        >
          Switch Network
        </TransactionButton>
      );
    }
    // not started
    if (statesReady && [0].includes(status)) {
      if (depositedAmount == 0) {
        return (
          <TransactionButton
            noConnectText={"Connect wallet to stake"}
            className={"button " + styles["register-button"]}
            onClick={() => Router.push("/stake")}
          >
            Staking Now
          </TransactionButton>
        );
      } else {
        return (
          <AppPopover content={"Not started!"} wrap={true}>
            {
              <TransactionButton
                disabled={true}
                noConnectText={"Connect wallet to register"}
                className={
                  "button " +
                  styles["register-button"] +
                  " " +
                  (isRegistered ? "disabled" : "")
                }
                onClick={registerForSale}
              >
                {
                  // isUserRegister ? 'Participate':
                  "Register"
                }
              </TransactionButton>
            }
          </AppPopover>
        );
      }
    }
    // in registration
    if (statesReady && [1].includes(status)) {
      if (depositedAmount == 0) {
        return (
          <TransactionButton
            noConnectText={"Connect wallet to stake"}
            className={
              "button " +
              styles["register-button"] +
              " " +
              (isRegistered ? "disabled" : "")
            }
            onClick={() => Router.push("/stake")}
          >
            Staking Now
          </TransactionButton>
        );
      } else {
        return (
          <TransactionButton
            disabled={isRegistered}
            disabledText={"Registered"}
            noConnectText={"Connect wallet to register"}
            className={
              "button " +
              styles["register-button"] +
              " " +
              (isRegistered ? "disabled" : "")
            }
            onClick={registerForSale}
            style={{ backgroundColor: "#D7FF1E" }}
          >
            {
              // isUserRegister ? 'Participate' :
              "Register"
            }
          </TransactionButton>
        );
      }
    }
    // in sale
    if (statesReady && [3].includes(status) && isRegistered) {
      return (
        <TransactionButton
          disabled={isParticipated}
          disabledText={"You have purchased"}
          noConnectText={"Connect wallet to purchase"}
          className={
            "button " +
            styles["purchase-button"] +
            " " +
            (isParticipated ? "disabled" : "")
          }
          onClick={() => setShowParticipateModal(true)}
        >
          Purchase
        </TransactionButton>
      );
    }
    // sale end
    if (statesReady && isParticipated && [4].includes(status)) {
      return (
        <AppPopover content={"Tokens not unlocked yet"}>
          <TransactionButton
            disabled={true}
            className={"button " + styles["purchase-button"]}
            noConnectText={"Connect wallet to withdraw"}
          >
            Withdraw
          </TransactionButton>
        </AppPopover>
      );
    }
    if (statesReady && isParticipated && [5].includes(status)) {
      return (
        <AppPopover
          wrap={true}
          content={withdrawTimeline()}
          placement={vestingPercentPerPortion.length >= 5 ? "right" : "top"}
        >
          <TransactionButton
            disabled={!canWithdrawArr.includes(true)}
            className={"button " + styles["purchase-button"]}
            noConnectText={"Connect wallet to withdraw"}
            onClick={withdrawTokens}
          >
            Withdraw
          </TransactionButton>
        </AppPopover>
      );
    }
    if (
      statesReady &&
      isRegistered &&
      !isParticipated &&
      [4, 5].includes(status)
    ) {
      return (
        <TransactionButton
          disabled={true}
          className={"button " + styles["purchase-button"]}
          noConnectText={"Connect wallet to withdraw"}
        >
          Sale ends
        </TransactionButton>
      );
    }
  };

  const cardInfo = useMemo(() => {
    // FIXME: get paymentTokenDecimals from backend
    const paymentTokenDecimas = 6;
    let tokenPriceInUsd = projectInfo.tokenPriceInPT
      ? Number(projectInfo.tokenPriceInPT) / Math.pow(10, paymentTokenDecimas)
      : 0;
    return {
      ...projectInfo,
      tokenPriceInUsd: tokenPriceInUsd,
    };
  }, [projectInfo]);

  const participateModalData = useMemo(() => {
    return {
      ...cardInfo,
      allocationTop,
      paymentTokenDecimal: depositDecimals || 18,
      paymentTokenSymbol: depositSymbol,
    };
  }, [cardInfo, allocationTop, depositDecimals, depositSymbol]);

  const withdrawTimeline = () => {
    return (
      <Timeline mode="left" style={{ color: "#ffffff", minWidth: "400px" }}>
        {vestingPortionsUnlockTime && vestingPercentPerPortion ? (
          vestingPortionsUnlockTime.map((sec, index) => {
            // status: 0-not start yet, 1-can withdraw, 2-Withdrawn
            let status: number = Date.now() + "" < sec + "000" ? 0 : 1;
            isPortionWithdrawn &&
              isPortionWithdrawn[index] &&
              status === 1 &&
              (status = 2);
            return (
              <Timeline.Item
                key={index}
                color={status === 0 ? "gray" : "#55BC7E"}
                label={formatDate(sec + "000", "hh:mm:ss, Month DD, YYYY")}
              >
                {vestingPercentPerPortion[index] / 10}% &nbsp;
                {status === 0 ? <span>(Locked)</span> : <></>}
                {status === 1 ? <span>(Available now)</span> : <></>}
                {status === 2 ? (
                  <span style={{ color: "#55BC7E" }}>(Withdrawn)</span>
                ) : (
                  <></>
                )}
              </Timeline.Item>
            );
          })
        ) : (
          <></>
        )}
      </Timeline>
    );
  };
  return (
    <main className={styles["container"] + " container"}>
      <PageLoader>
        <section className={styles["intro"] + " main-content"}>
          <Row
            justify="space-between"
            align="middle"
            style={{ marginTop: "42px" }}
          >
            <Col span={24}>
              <h2 className={styles["pool-title"]}>{projectInfo.name || ""}</h2>
            </Col>
          </Row>
          <Row style={{ marginTop: "42px" }}>
            <Col span={24}>
              <div className={styles["pool-desc"]}>
                {projectInfo.description || ""}
              </div>
            </Col>
          </Row>
          {/* buttons */}
          <Row
            justify="start"
            align="middle"
            style={{ marginTop: "42px" }}
            gutter={[16, 16]}
          >
            <Col span={isDesktopOrLaptop ? 6 : 24}>
              <TransactionButton
                className={"button " + styles["add-token-button"]}
                onClick={() => {
                  addToken(projectInfo.tokenAddress, projectInfo.symbol);
                }}
              >
                Add {projectInfo.symbol} to Wallet
              </TransactionButton>
            </Col>
            <Col span={isDesktopOrLaptop ? 6 : 24}>{getActionButton()}</Col>
          </Row>
          <Row style={{ marginTop: "55px" }}>
            <Col span={24}>
              <PoolCard
                className={styles["pool-info"]}
                info={{
                  paymentTokenDecimals: depositDecimals,
                  ...cardInfo,
                  status,
                }}
                styleNames={styles}
              />
            </Col>
          </Row>
          <Row className={styles["progress"]} gutter={[0, 16]}>
            {isDesktopOrLaptop ? (
              <div className={styles["divider"]}></div>
            ) : (
              <></>
            )}
            {[
              {
                stage: "Registration Opens",
                time: mileStones.registrationTimeStarts,
              },
              {
                stage: "Registration Closes",
                time: mileStones.registrationTimeEnds,
              },
              { stage: "Sale Starts", time: mileStones.saleStart },
              { stage: "Sale Ends", time: mileStones.saleEnd },
            ].map((info, index) => {
              return (
                <Col
                  span={isDesktopOrLaptop ? 6 : 24}
                  className={
                    styles["item"] +
                    " " +
                    (index < status ? styles["active"] : "")
                  }
                  key={index}
                >
                  <Row justify="center" align="middle" gutter={[0, 16]}>
                    <Col span={isDesktopOrLaptop ? 24 : 12}>
                      <i
                        className={
                          styles["icon"] +
                          " " +
                          styles["icon-pool-" + (index + 1)]
                        }
                      ></i>
                    </Col>
                    <Col span={isDesktopOrLaptop ? 24 : 12}>
                      <div className={styles["label"]}>
                        {info.stage}
                        <br />
                        {formatDate(info.time, "HH:mm")},
                        <br />
                        {formatDate(info.time, "Month DD, YYYY")}
                      </div>
                    </Col>
                  </Row>
                </Col>
              );
            })}
          </Row>
        </section>
        <section className={styles["detail"]}>
          <div className={styles["tab-info"]}>
            <div className={styles["menu"]}>
              <Row className="main-content" justify="start" align="middle">
                {[
                  ["Sale Info", "sale_info"],
                  ["Token Info", "token_info"],
                  [isDesktopOrLaptop ? "About the Project" : "About", "about"],
                  [
                    isDesktopOrLaptop ? "Your Allocations" : "Allocations",
                    "allocations",
                  ],
                ].map(([title, key], index) => (
                  <Col
                    span={isDesktopOrLaptop ? 3 : 6}
                    key={index}
                    className={
                      styles["item"] +
                      " " +
                      ((tab == key && styles["active"]) || "")
                    }
                    onClick={() => setTab(key)}
                  >
                    {title}
                  </Col>
                ))}
              </Row>
            </div>
            <div className="main-content">
              <div className={styles["tabs"]}>{getTabInfo()}</div>
            </div>
          </div>
        </section>
      </PageLoader>
      <ParticipateModal
        visible={showParticipateModal}
        data={participateModalData}
        handleOk={participate}
        handleCancel={() => setShowParticipateModal(false)}
        tokenPriceInPT={projectInfo.tokenPriceInPT}
      />
    </main>
  );
}
