package com.bobabrewery;

import com.bobabrewery.repo.common.model.ProductPO;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.commons.lang.StringUtils;
import org.assertj.core.util.Lists;
import org.web3j.abi.EventEncoder;
import org.web3j.abi.FunctionReturnDecoder;
import org.web3j.abi.TypeReference;
import org.web3j.abi.datatypes.*;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.DefaultBlockParameter;
import org.web3j.protocol.core.DefaultBlockParameterName;
import org.web3j.protocol.core.methods.request.EthFilter;
import org.web3j.protocol.core.methods.response.EthLog;
import org.web3j.protocol.core.methods.response.Web3ClientVersion;
import org.web3j.protocol.http.HttpService;

import java.math.BigInteger;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

public class SaleParamEventListeningTest {

    /**
     * topic0,keccak256 of SaleCreated(address,uint256,uint256,uint256)
     * param0:saleOwner
     * param1:tokenPriceInETH
     * param2:amountOfTokensToSell
     * param3:saleEnd
     */



    private final static String CONTRACT_SALE_ADDRESS="0x61c36a8d610163660E21a8b7359e1Cac0C9133e1";


    public static void main4(String[] args) throws Exception {
        Web3j web3 = Web3j.build(new HttpService("http://127.0.0.1:8545/"));  // defaults to http://localhost:8545/
        Web3ClientVersion web3ClientVersion = web3.web3ClientVersion().send();
        String clientVersion = web3ClientVersion.getWeb3ClientVersion();
        System.out.println(clientVersion);

        EthFilter filter = new EthFilter(DefaultBlockParameterName.LATEST, DefaultBlockParameterName.LATEST,Lists.newArrayList(CONTRACT_SALE_ADDRESS));
        filter.addOptionalTopics(EventEncoder.buildEventSignature(SET_SALES_PARAMS_EVENT));


        List<TypeReference<Type>> outputParameters =new ArrayList<>();
        outputParameters.add(TypeReference.makeTypeReference("address"));
        outputParameters.add(TypeReference.makeTypeReference("uint256"));
        outputParameters.add(TypeReference.makeTypeReference("uint256"));
        outputParameters.add(TypeReference.makeTypeReference("uint256"));

        web3.ethLogFlowable(filter).subscribe(eventLog -> {
            if (eventLog.getAddress() !=""
                    && CollectionUtils.isNotEmpty(eventLog.getTopics())
                    && eventLog.getTopics().get(0).toLowerCase().equals(EventEncoder.buildEventSignature(SET_SALES_PARAMS_EVENT))) {
                //decode data to (address,uint256,uint256,uint256)

                List<Type> types=FunctionReturnDecoder.decode(eventLog.getData(),outputParameters);

                //常量
                String _saleAddress=CONTRACT_SALE_ADDRESS;
                //从contract.sale.token获取
                String _saleToken;
                //event.saleOwner
                String _saleOwner=types.get(0).getValue().toString();
                //event.tokenPriceInETH
                String tokenPriceInEth=types.get(1).getValue().toString();
                //event.amountOfTokenToSell
                String totalTokens=types.get(2).getValue().toString();
                //event.saleEnd
                String saleEndTime=types.get(3).getValue().toString();


                System.out.println(_saleOwner);
                System.out.println(tokenPriceInEth);
                System.out.println(totalTokens);
                System.out.println(saleEndTime);

            }
        });
        System.out.println("---------->");




    }
    private static String SALE_EVENT_CREATED = "SaleCreated(address,uint256,uint256,uint256)";
    private final static String SET_SALES_PARAMS_EVENT="SaleCreated(address,uint256,uint256,uint256)";
    private static String SALE_EVENT_STARTTIME = "StartTimeSet(uint256)";
    private static String SALE_EVENT_REGISTRATIONTIME = "RegistrationTimeSet(uint256,uint256)";

    public static void main34(String[] args){
      System.out.println(EventEncoder.buildEventSignature(SALE_EVENT_CREATED));
        System.out.println(EventEncoder.buildEventSignature(SALE_EVENT_STARTTIME));
        System.out.println(EventEncoder.buildEventSignature(SALE_EVENT_REGISTRATIONTIME));
    }
    public static void  main(String[] args) throws Exception {

        Web3j web3 = Web3j.build(new HttpService("http://127.0.0.1:8545/"));  // defaults to http://localhost:8545/

        EthFilter filter = new EthFilter(DefaultBlockParameter.valueOf(BigInteger.ZERO), DefaultBlockParameterName.LATEST,Lists.newArrayList(CONTRACT_SALE_ADDRESS));
        filter.addOptionalTopics(EventEncoder.buildEventSignature(SALE_EVENT_STARTTIME));
        filter.addOptionalTopics(EventEncoder.buildEventSignature(SALE_EVENT_CREATED));
        filter.addOptionalTopics(EventEncoder.buildEventSignature(SALE_EVENT_REGISTRATIONTIME));

     /*   web3.ethLogFlowable(filter).subscribe(eventLog -> {

            System.out.println("监听到事件变更,event="+eventLog.getTopics().get(0));

        });*/

        EthLog log= web3.ethGetLogs(filter).send();

        System.out.println(log);

    }
}
