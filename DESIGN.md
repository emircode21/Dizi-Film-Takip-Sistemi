# CineMory — Tasarım Sistemi

Sıcak, butik, biraz romantik bir dizi/film günlüğü. Koyu mor zemin + pembe
vurgu varsayılan; açık tema aynı ruhu krem/toz pembe tonlarında taşır. Bu
dosya `css/stil.css`'teki token'ların ne için var olduğunu ve nasıl
kullanılacağını özetler — palet **değişmeyecek**, sadece ölçek disiplinini
korumak için var.

## Renkler

Rol bazlı, iki temada da aynı isimler farklı değerlerle tanımlı
(`css/stil.css:7-43`).

| Token | Rolü |
|---|---|
| `--arka`, `--arka-2` | Sayfa zemini, ikincil zemin |
| `--kart`, `--kart-2` | Yüzey (kart, modal, popover) |
| `--kenar` | İnce ayraç/border |
| `--yazi` | Birincil metin |
| `--soluk` | İkincil/meta metin |
| `--vurgu`, `--vurgu-koyu`, `--vurgu-yumusak` | Marka rengi (pembe) — CTA, aktif durum, vurgu arka planı |
| `--altin` | Puan/yıldız/ödül vurgusu |
| `--mavi`, `--mavi-yumusak` | Bilgilendirici ikincil vurgu |
| `--tehlike` | Hata/silme |
| `--golge` | Yükselti gölgesi |

## Boşluk ölçeği

`css/stil.css:46-53`. `padding`, `margin`, `gap` için — yeni bir değer
eklemeden önce burada en yakın basamak var mı diye bak.

```
--bo-1: 4px    --bo-2: 8px    --bo-3: 12px   --bo-4: 16px
--bo-5: 24px   --bo-6: 32px   --bo-7: 48px
```

## Köşe yarıçapı ölçeği

`css/stil.css:55-58`.

| Token | Değer | Kullanım |
|---|---|---|
| `--yari-1` | 8px | rozet, çip, select |
| `--yari-2` | 12px | buton, input |
| `--yari-3` | 16px | kart yüzeyleri |
| `--yari-4` | 22px | modal üst köşeleri |

## Punto ölçeği

`css/stil.css:60-67`.

```
--punto-1: 11px  --punto-2: 12px  --punto-3: 13px  --punto-4: 14px
--punto-5: 16px  --punto-6: 20px  --punto-7: 24px  --punto-8: 30px
```

## Geçiş

`--gecis: 0.15s ease` — hover/active gibi mikro etkileşimler için tek süre.
(Modal açılış/kapanış gibi daha büyük hareketler kendi süresini korur.)

## Elevation merdiveni

1. Sayfa zemini (`--arka`) — gölgesiz
2. Kart (`--kart`, `--yari-3` köşe) — gölgesiz, sadece `--kenar` border
3. Popover/dropdown (`--kart`, `box-shadow: var(--golge)`)
4. Modal (`--kart`, `--yari-4` köşe, `box-shadow: var(--golge)`) — en üst katman

## Dokunma hedefi

Mobilde interaktif öğeler **en az 40px** dokunma alanına sahip olmalı
(görsel boyut aynı kalabilir, `padding` ile genişletilir). Bkz. plan
dosyasındaki Faz 3.

## Do's / Don'ts

- ✅ Yeni bir buton/kart eklerken önce bu tablodaki en yakın token'ı kullan.
- ✅ Odak halkası (`:focus-visible`), hover/active durumu her interaktif
  öğede olsun.
- ✅ `prefers-reduced-motion` altında sonsuz animasyonlar durmalı.
- ❌ Yeni bir `border-radius`/`padding`/`font-size` sayısı icat etme —
  önce bu ölçeklerde karşılığı var mı bak.
- ❌ Renk paletine yeni bir hex değeri ekleme — mevcut rol token'larından
  birini kullan.
