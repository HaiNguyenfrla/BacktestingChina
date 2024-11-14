import React, { useState, useEffect } from 'react';
import { format } from "d3-format";
import { timeFormat } from "d3-time-format";
import {
  elderRay, ema, wma, tma, sma, discontinuousTimeScaleProviderBuilder, Chart, ChartCanvas,
  CurrentCoordinate, BarSeries, ElderRaySeries, LineSeries, MovingAverageTooltip,
  OHLCTooltip, SingleValueTooltip, lastVisibleItemBasedZoomAnchor, XAxis, YAxis, CrossHairCursor,
  EdgeIndicator, MouseCoordinateX, MouseCoordinateY, ZoomButtons, LabelAnnotation, Annotate, CandlestickSeries
} from "react-financial-charts";

import { klinesData } from "./klinesData";
import './FCChart.css';

const height = (window.innerHeight * 0.6);
const width = (window.innerWidth * 0.97);

const margin = { left: 0, right: 48, top: 0, bottom: 24 };


const formatVolume = (value) => {
  if (value >= 1e6) {
    return format(".1s")(value); // Million (M)
  } else if (value >= 1e3) {
    return format(".1s")(value); // Thousand (k)
  }
  return value; // Return as-is if it's below 1k
};

const formatPriceInUSDT = (btcPrice) => {
  const priceInUSDT = 1 / btcPrice;

  const whole = Math.floor(priceInUSDT);
  const decimal = (priceInUSDT % 1).toFixed(2).slice(2);

  const wholeFormatted = whole >= 1000 ? `${(whole / 1000).toFixed(0)}k` : whole;

  return `${wholeFormatted} ${decimal}`;
};

const annotations = [
  {
    type: "buy",
    timestamp: "2024-11-11T11:00:00.000Z",
    fill: "green",
    strokeWidth: 2,
    radius: 10,
  },
  {
    type: "sell",
    timestamp: "2024-11-11T12:00:00.000Z",
    fill: "red",
    strokeWidth: 2,
    radius: 10,
  },
];

const FCChart = (props) => {

  const ScaleProvider = discontinuousTimeScaleProviderBuilder().inputDateAccessor(
    (d) => new Date(d.timestamp)
  );

  const pricesDisplayFormat = format(".6f");
  const dateTimeFormat = "%Y.%m.%d";
  const timeDisplayFormat = timeFormat(dateTimeFormat);

  const parsetimestamp = ((param) => {
    const parsedData = param.map((item) => ({
      ...item,
      date: new Date(item.timestamp),
    }));

    return parsedData;
  })

  const [tData, SetTData] = useState(parsetimestamp(klinesData));
  const elder = elderRay();

  const { data, xScale, xAccessor, displayXAccessor } = ScaleProvider(tData);

  const max = xAccessor(data[data.length - 1]);
  const min = xAccessor(data[Math.max(0, 0)]);
  const xExtents = [min, max + 5];

  const gridHeight = height - margin.top - margin.bottom;
  const elderRayHeight = 100;
  const elderRayOrigin = (_, h) => [0, h - elderRayHeight];
  const barChartHeight = gridHeight / 4;
  const barChartOrigin = (_, h) => [0, h - barChartHeight - elderRayHeight];
  const chartHeight = gridHeight - elderRayHeight;

  const ema26 = ema()
    .id(1)
    .options({ windowSize: 26 })
    .merge((d, c) => {
      d.ema26 = c;
    })
    .accessor((d) => d.ema26);

  const tma26 = tma()
    .id(2)
    .options({ windowSize: 26 })
    .merge((d, c) => {
      d.tma26  = c;
    })
    .accessor((d) => d.tma26);

  const wma26 = wma()
    .id(3)
    .options({ windowSize: 26 })
    .merge((d, c) => {
      d.wma26 = c;
    })
    .accessor((d) => d.wma26);

  const sma26 = sma()
    .id(4)
    .options({ windowSize: 26 })
    .merge((d, c) => {
      d.sma26  = c;
    })
    .accessor((d) => d.sma26);

  const barChartExtents = (data) => {
    return data.volume;
  };

  const candleChartExtents = (data) => {
    return [data.high, data.low];
  };

  const yEdgeIndicator = (data) => {
    return data.close;
  };

  const volumeColor = (data) => {
    return data.close > data.open
      ? "rgba(38, 166, 154, 0.3)"
      : "rgba(239, 83, 80, 0.3)";
  };

  const volumeSeries = (data) => {
    return data.volume;
  };

  const openCloseColor = (data) => {
    return data.close > data.open ? "#26a69a" : "#ef5350";
  };
  
  useEffect(() => {
    elder(wma26(tData));
    elder(tma26(tData));
    elder(sma26(tData));
  }, [tData, elder, wma26, tma26, sma26]);

  if (data == null) {
    console.log("sorry data isn't loading");
    return;
  }

  return (
    <ChartCanvas
      height={height}
      ratio={3}
      width={width}
      margin={margin}
      data={data}
      displayXAccessor={displayXAccessor}
      seriesName="Data"
      xScale={xScale}
      xAccessor={xAccessor}
      xExtents={xExtents}
      zoomAnchor={lastVisibleItemBasedZoomAnchor}
      style={{
        backgroundColor: 'white',
      }}
    >
      <Chart
        id={2}
        height={barChartHeight}
        origin={barChartOrigin}
        yExtents={barChartExtents}
      >
        <BarSeries fillStyle={volumeColor} yAccessor={volumeSeries} />
      </Chart>
      <Chart id={3} height={chartHeight} yExtents={candleChartExtents}>

        <YAxis
          tickLabelFill="#00bcd4"
          strokeStyle="rgba(255, 255, 255, 0.1)"
          showTicks={true}
          tickFormat={(value) => formatPriceInUSDT(value)}
        />
        <XAxis showTickLabel={true} tickLabelFill="#10e5c9" />
      
        { props.prMoveAverages.CandlestickSeries === true 
          ? <CandlestickSeries />
          : <></>
        }
          
        {props.prMoveAverages.WMA === true && tData.length > 0 ? 
          <>
            <LineSeries yAccessor={wma26.accessor()} strokeStyle={wma26.stroke()} />
            <CurrentCoordinate
              yAccessor={wma26.accessor()}
              fillStyle={wma26.stroke()}
            />
          </>
          :
          <></>
        }

        {props.prMoveAverages.TMA === true && tData.length > 0 ? 
          <>
            <LineSeries yAccessor={tma26.accessor()} strokeStyle={tma26.stroke()} />
            <CurrentCoordinate
              yAccessor={tma26.accessor()}
              fillStyle={tma26.stroke()}
            />
          </>
          :
          <></>
        }
        
        {props.prMoveAverages.SMA === true && tData.length > 0 ? 
          <>
            <LineSeries yAccessor={sma26.accessor()} strokeStyle={sma26.stroke()} />
            <CurrentCoordinate
              yAccessor={sma26.accessor()}
              fillStyle={sma26.stroke()}
            />
          </>
          :
          <></>
        }

        <MouseCoordinateY
          rectWidth={margin.right}
          displayFormat={pricesDisplayFormat}
          textFill="white"
        />

        <EdgeIndicator
          itemType="last"
          rectWidth={margin.right}
          fill={openCloseColor}
          lineStroke={openCloseColor}
          displayFormat={(value) => formatPriceInUSDT(value)}
          yAccessor={yEdgeIndicator}
          textFill="white"
        />
        { tData.length > 0 
          ? 
            <MovingAverageTooltip
              tickLabelFill="white"
              textFill="white"
              labelFill="white"
              fontSize="12px"
              origin={[8, 24]}
              options={[
                {
                  yAccessor: ema26.accessor(),
                  type: "EMA",
                  stroke: ema26.stroke(),
                  windowSize: ema26.options().windowSize,
                },
                {
                  yAccessor: tma26.accessor(),
                  type: "TMA",
                  stroke: tma26.stroke(),
                  windowSize: tma26.options().windowSize
                },
                {
                  yAccessor: wma26.accessor(),
                  type: "WMA",
                  stroke: wma26.stroke(),
                  windowSize: wma26.options().windowSize
                },
                {
                  yAccessor: sma26.accessor(),
                  type: "SMA",
                  stroke: sma26.stroke(),
                  windowSize: sma26.options().windowSize
                },
              ]}
            />
          : <></>
        }
        {
          data.length > 0
          ?
            <Annotate
              with={LabelAnnotation}
              when={(data) => {
                const found = annotations.some((a) => a.timestamp === data.timestamp);
                console.log("Annotation found:", found);
                return found;
              }}
              usingProps={(datum) => {
                const annotation = annotations.find((a) => a.timestamp === datum.timestamp);
                const x = annotation?.x || 0; // Set default if x is undefined
                const y = annotation?.y || 0; // Set default if y is undefined
                const transformValue = `translate(${x}, ${y})`;
                console.log({ annotation });
                if (!annotation) return {};  // Safeguard against missing annotation
              
                return {
                  text: annotation.type || "",
                  transform: transformValue,
                  textFill: "white",
                  bgFill: annotation.fill || "black",
                  bgOpacity: 1,
                  stroke: annotation.fill || "black",
                  strokeWidth: annotation.strokeWidth || 1,
                  radius: annotation.radius || 5,
                  arrowWidth: 50,
                  arrowHeight: 50,
                  fontWeight: "bold",
                  fontSize: 20,
                  padding: 5,
                };
              }}
            />
          :<></>
        }

        <ZoomButtons />

        <OHLCTooltip
          origin={[8, 16]}
          textFill="white"
        />
      </Chart>
      <Chart
        id={4}
        height={elderRayHeight}
        yExtents={[0, elder.accessor()]}
        origin={elderRayOrigin}
        padding={{ top: 8, bottom: 8 }}
      >
        <XAxis  
          strokeStyle="rgba(255, 255, 255, 0.1)"
          tickFormat={formatVolume}
          showTickLabel={true} 
          tickLabelFill="#10e5c9"
        />

        <MouseCoordinateX displayFormat={timeDisplayFormat} />

        <MouseCoordinateY
          rectWidth={margin.right}
          displayFormat={pricesDisplayFormat}
        />

        <ElderRaySeries yAccessor={elder.accessor()} />
        
        <SingleValueTooltip
          yAccessor={elder.accessor()}
          yLabel="Elder Ray"
          yDisplayFormat={(d) =>
            `${pricesDisplayFormat(d.bullPower)}, ${pricesDisplayFormat(
              d.bearPower
            )}`
          }
          origin={[8, 16]}
        />
    
      </Chart>
      <CrossHairCursor />
    </ChartCanvas>
  );
};

export default FCChart
