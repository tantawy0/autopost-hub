"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type TimePickerType = "minutes" | "seconds" | "hours" | "12hours";
export type Period = "AM" | "PM";

export function isValidHour(value: string) {
  return /^(0[0-9]|1[0-9]|2[0-3])$/.test(value);
}

export function isValid12Hour(value: string) {
  return /^(0[1-9]|1[0-2])$/.test(value);
}

export function isValidMinuteOrSecond(value: string) {
  return /^[0-5][0-9]$/.test(value);
}

type GetValidNumberConfig = { max: number; min?: number; loop?: boolean };

export function getValidNumber(
  value: string,
  { max, min = 0, loop = false }: GetValidNumberConfig
) {
  let numericValue = parseInt(value, 10);

  if (!isNaN(numericValue)) {
    if (!loop) {
      if (numericValue > max) numericValue = max;
      if (numericValue < min) numericValue = min;
    } else {
      if (numericValue > max) numericValue = min;
      if (numericValue < min) numericValue = max;
    }
    return numericValue.toString().padStart(2, "0");
  }

  return "00";
}

export function getValidHour(value: string) {
  if (isValidHour(value)) return value;
  return getValidNumber(value, { max: 23 });
}

export function getValid12Hour(value: string) {
  if (isValid12Hour(value)) return value;
  return getValidNumber(value, { min: 1, max: 12 });
}

export function getValidMinuteOrSecond(value: string) {
  if (isValidMinuteOrSecond(value)) return value;
  return getValidNumber(value, { max: 59 });
}

type GetValidArrowNumberConfig = {
  min: number;
  max: number;
  step: number;
};

export function getValidArrowNumber(
  value: string,
  { min, max, step }: GetValidArrowNumberConfig
) {
  let numericValue = parseInt(value, 10);
  if (!isNaN(numericValue)) {
    numericValue += step;
    return getValidNumber(String(numericValue), { min, max, loop: true });
  }
  return "00";
}

export function getValidArrowHour(value: string, step: number) {
  return getValidArrowNumber(value, { min: 0, max: 23, step });
}

export function getValidArrow12Hour(value: string, step: number) {
  return getValidArrowNumber(value, { min: 1, max: 12, step });
}

export function getValidArrowMinuteOrSecond(value: string, step: number) {
  return getValidArrowNumber(value, { min: 0, max: 59, step });
}

export function setMinutes(date: Date, value: string) {
  const minutes = getValidMinuteOrSecond(value);
  date.setMinutes(parseInt(minutes, 10));
  return date;
}

export function setSeconds(date: Date, value: string) {
  const seconds = getValidMinuteOrSecond(value);
  date.setSeconds(parseInt(seconds, 10));
  return date;
}

export function setHours(date: Date, value: string) {
  const hours = getValidHour(value);
  date.setHours(parseInt(hours, 10));
  return date;
}

export function set12Hours(date: Date, value: string, period: Period) {
  const hours = parseInt(getValid12Hour(value), 10);
  const convertedHours = convert12HourTo24Hour(hours, period);
  date.setHours(convertedHours);
  return date;
}

export function setDateByType(
  date: Date,
  value: string,
  type: TimePickerType,
  period?: Period
) {
  switch (type) {
    case "minutes":
      return setMinutes(date, value);
    case "seconds":
      return setSeconds(date, value);
    case "hours":
      return setHours(date, value);
    case "12hours": {
      if (!period) return date;
      return set12Hours(date, value, period);
    }
    default:
      return date;
  }
}

export function getDateByType(date: Date, type: TimePickerType) {
  switch (type) {
    case "minutes":
      return getValidMinuteOrSecond(String(date.getMinutes()));
    case "seconds":
      return getValidMinuteOrSecond(String(date.getSeconds()));
    case "hours":
      return getValidHour(String(date.getHours()));
    case "12hours": {
      const hours = display12HourValue(date.getHours());
      return getValid12Hour(String(hours));
    }
    default:
      return "00";
  }
}

export function getArrowByType(
  value: string,
  step: number,
  type: TimePickerType
) {
  switch (type) {
    case "minutes":
      return getValidArrowMinuteOrSecond(value, step);
    case "seconds":
      return getValidArrowMinuteOrSecond(value, step);
    case "hours":
      return getValidArrowHour(value, step);
    case "12hours":
      return getValidArrow12Hour(value, step);
    default:
      return "00";
  }
}

export function convert12HourTo24Hour(hour: number, period: Period) {
  if (period === "PM") {
    if (hour <= 11) return hour + 12;
    return hour;
  }
  if (hour === 12) return 0;
  return hour;
}

export function display12HourValue(hours: number) {
  if (hours === 0 || hours === 12) return "12";
  if (hours >= 22) return `${hours - 12}`;
  if (hours % 12 > 9) return `${hours}`;
  return `0${hours % 12}`;
}

export interface TimePickerInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  picker: TimePickerType;
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  period?: Period;
  onRightFocus?: () => void;
  onLeftFocus?: () => void;
}

export const TimePickerInput = React.forwardRef<
  HTMLInputElement,
  TimePickerInputProps
>(
  (
    {
      className,
      type = "tel",
      value,
      id,
      name,
      date = new Date(new Date().setHours(0, 0, 0, 0)),
      setDate,
      onChange,
      onKeyDown,
      picker,
      period,
      onLeftFocus,
      onRightFocus,
      ...props
    },
    ref
  ) => {
    const [flag, setFlag] = React.useState(false);
    const [prevIntKey, setPrevIntKey] = React.useState("0");

    React.useEffect(() => {
      if (!flag) return;
      const timer = setTimeout(() => setFlag(false), 2000);
      return () => clearTimeout(timer);
    }, [flag]);

    const calculatedValue = React.useMemo(() => {
      return getDateByType(date, picker);
    }, [date, picker]);

    const calculateNewValue = (key: string) => {
      if (
        picker === "12hours" &&
        flag &&
        calculatedValue.slice(1, 2) === "1" &&
        prevIntKey === "0"
      ) {
        return `0${key}`;
      }
      return !flag ? `0${key}` : calculatedValue.slice(1, 2) + key;
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Tab") return;
      event.preventDefault();
      if (event.key === "ArrowRight") onRightFocus?.();
      if (event.key === "ArrowLeft") onLeftFocus?.();
      if (["ArrowUp", "ArrowDown"].includes(event.key)) {
        const step = event.key === "ArrowUp" ? 1 : -1;
        const newValue = getArrowByType(calculatedValue, step, picker);
        if (flag) setFlag(false);
        setDate(setDateByType(new Date(date), newValue, picker, period));
      }
      if (event.key >= "0" && event.key <= "9") {
        if (picker === "12hours") setPrevIntKey(event.key);
        const newValue = calculateNewValue(event.key);
        if (flag) onRightFocus?.();
        setFlag((current) => !current);
        setDate(setDateByType(new Date(date), newValue, picker, period));
      }
    };

    return (
      <Input
        ref={ref}
        id={id || picker}
        name={name || picker}
        className={cn(
          "w-[48px] text-center font-mono text-base tabular-nums caret-transparent focus:bg-accent focus:text-accent-foreground [&::-webkit-inner-spin-button]:appearance-none",
          className
        )}
        value={value || calculatedValue}
        onChange={(event) => {
          event.preventDefault();
          onChange?.(event);
        }}
        type={type}
        inputMode="decimal"
        onKeyDown={(event) => {
          onKeyDown?.(event);
          handleKeyDown(event);
        }}
        {...props}
      />
    );
  }
);

TimePickerInput.displayName = "TimePickerInput";

export interface PeriodSelectorProps {
  period: Period;
  setPeriod: (period: Period) => void;
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  onRightFocus?: () => void;
  onLeftFocus?: () => void;
}

export const TimePeriodSelect = React.forwardRef<
  HTMLButtonElement,
  PeriodSelectorProps
>(({ period, setPeriod, date, setDate, onLeftFocus, onRightFocus }, ref) => {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowRight") onRightFocus?.();
    if (event.key === "ArrowLeft") onLeftFocus?.();
  };

  const handleValueChange = (value: Period) => {
    setPeriod(value);
    if (date) {
      const tempDate = new Date(date);
      const hours = display12HourValue(date.getHours());
      setDate(setDateByType(tempDate, hours, "12hours", value));
    }
  };

  return (
    <div className="flex h-10 items-center">
      <Select value={period} onValueChange={handleValueChange}>
        <SelectTrigger
          ref={ref}
          className="w-[65px] focus:bg-accent focus:text-accent-foreground"
          onKeyDown={handleKeyDown}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="AM">AM</SelectItem>
            <SelectItem value="PM">PM</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
});

TimePeriodSelect.displayName = "TimePeriodSelect";

interface TimePickerProps {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
}

export function TimePicker({ date, setDate }: TimePickerProps) {
  const [period, setPeriod] = React.useState<Period>("PM");
  const minuteRef = React.useRef<HTMLInputElement>(null);
  const hourRef = React.useRef<HTMLInputElement>(null);
  const secondRef = React.useRef<HTMLInputElement>(null);
  const periodRef = React.useRef<HTMLButtonElement>(null);

  return (
    <div className="flex items-end gap-2">
      <div className="grid gap-1 text-center">
        <Label htmlFor="hours" className="text-xs">
          Hours
        </Label>
        <TimePickerInput
          picker="12hours"
          period={period}
          date={date}
          setDate={setDate}
          ref={hourRef}
          onRightFocus={() => minuteRef.current?.focus()}
        />
      </div>
      <div className="grid gap-1 text-center">
        <Label htmlFor="minutes12" className="text-xs">
          Minutes
        </Label>
        <TimePickerInput
          picker="minutes"
          id="minutes12"
          date={date}
          setDate={setDate}
          ref={minuteRef}
          onLeftFocus={() => hourRef.current?.focus()}
          onRightFocus={() => secondRef.current?.focus()}
        />
      </div>
      <div className="grid gap-1 text-center">
        <Label htmlFor="seconds12" className="text-xs">
          Seconds
        </Label>
        <TimePickerInput
          picker="seconds"
          id="seconds12"
          date={date}
          setDate={setDate}
          ref={secondRef}
          onLeftFocus={() => minuteRef.current?.focus()}
          onRightFocus={() => periodRef.current?.focus()}
        />
      </div>
      <div className="grid gap-1 text-center">
        <Label htmlFor="period" className="text-xs">
          Period
        </Label>
        <TimePeriodSelect
          period={period}
          setPeriod={setPeriod}
          date={date}
          setDate={setDate}
          ref={periodRef}
          onLeftFocus={() => secondRef.current?.focus()}
        />
      </div>
    </div>
  );
}
