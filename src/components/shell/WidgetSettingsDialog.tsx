import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SettingSchema } from '@/lib/widget-sdk/types';
import { getSettingsSync, setAllSettings } from '@/lib/widget-sdk/settings-cache';

interface WidgetSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widgetInstanceId: string;
  widgetName: string;
  schema: Record<string, SettingSchema>;
}

export function WidgetSettingsDialog({
  open,
  onOpenChange,
  widgetInstanceId,
  widgetName,
  schema,
}: WidgetSettingsDialogProps) {
  const [values, setValues] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (open) {
      const saved = getSettingsSync(widgetInstanceId);
      const merged: Record<string, unknown> = {};
      for (const [key, def] of Object.entries(schema)) {
        merged[key] = saved[key] ?? def.default;
      }
      setValues(merged);
    }
  }, [open, widgetInstanceId, schema]);

  function setValue(key: string, value: unknown): void {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(): Promise<void> {
    await setAllSettings(widgetInstanceId, values);
    onOpenChange(false);
  }

  const entries = Object.entries(schema);

  if (entries.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{widgetName} Settings</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This widget has no configurable settings.
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{widgetName} Settings</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          {entries.map(([key, def]) => (
            <SettingField
              key={key}
              settingKey={key}
              schema={def}
              value={values[key] ?? def.default}
              onChange={(v) => setValue(key, v)}
            />
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface SettingFieldProps {
  settingKey: string;
  schema: SettingSchema;
  value: unknown;
  onChange: (value: unknown) => void;
}

function SettingField({ settingKey, schema, value, onChange }: SettingFieldProps) {
  switch (schema.type) {
    case 'boolean':
      return (
        <div className="flex items-center justify-between">
          <Label htmlFor={settingKey}>{schema.label}</Label>
          <Switch
            id={settingKey}
            checked={Boolean(value)}
            onCheckedChange={(checked) => onChange(checked)}
          />
        </div>
      );

    case 'number':
      return (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={settingKey}>{schema.label}</Label>
          <Input
            id={settingKey}
            type="number"
            value={value !== undefined ? String(value) : ''}
            onChange={(e) => onChange(Number(e.target.value))}
          />
        </div>
      );

    case 'select':
      return (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={settingKey}>{schema.label}</Label>
          <Select value={String(value ?? '')} onValueChange={(v) => onChange(v)}>
            <SelectTrigger id={settingKey}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {schema.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    case 'string':
    default:
      return (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={settingKey}>{schema.label}</Label>
          <Input
            id={settingKey}
            type="text"
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
  }
}
