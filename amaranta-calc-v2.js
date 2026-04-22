window.CCalc = {}

CCalc.lotSelector = '#PLANO path';
CCalc.selectedClass = 'selected';
CCalc.policies = {};
var planSelectElement = $('#initial-select');

$('script[type="application/json"].creatory-plan').each(function (index) {
  var planData = JSON.parse($(this).text());
  var id = String(planData.id);
  CCalc.policies[id] = planData;
  var planOpt = '<option value="' + id + '" >' + planData.name + '</option>';
  planSelectElement.append(planOpt);
  if (index === 0) {
    CCalc.selectedPlanName = id;
  }
});

CCalc.STATUS = {
  AVAILABLE: 'available',
  BLOCKED: 'blocked',
  SOLD: 'sold'
};

CCalc.LOTS = {};

CCalc.selectedLot = undefined;
CCalc.selectedPlan = CCalc.policies[CCalc.selectedPlanName];

function c(n) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(+n);
}

function loadLotData() {
  if (!CCalc.selectedLot) return;
  $('#lot-name').text(CCalc.selectedLot.name);
  $('#lot-desc').text(CCalc.selectedLot.desc);
  $('#lot-sqmeters').text(CCalc.selectedLot.sqMeters);
  $('#lot-list-price').text(c(CCalc.selectedLot.listPrice));
  const blueprintImage = $('#lot-blueprint').children('img');
  $('#lot-blueprint').attr('href', CCalc.selectedLot.blueprintUrl)
  blueprintImage.attr('srcset', null);
  blueprintImage.attr('src', CCalc.selectedLot.blueprintUrl);
}

function loadPaymentsData(p) {
  if (!p) return;
  $('#lot-discount').text(p.discount);
  $('#lot-price').text(c(p.finalPrice));
  $('#deferred-percentage').text(p.deferred.percentage);
  $('#payment-term').text(p.deferred.term);
  $('#final-percentage').text(p.final.percentage);
  $('#initial-amount').text(c(p.initial.amount));
  $('#deferred-monthly').text(c(p.deferred.monthly));
  $('#final-amount').text(c(p.final.amount));

  // if (CCalc.selectedLot.discount > 0) {
  //    $('#lot-discount').text(CCalc.selectedLot.discount);
  //   $('#lot-discount-wrapper').show();
  //   $('#lot-price').text(c(CCalc.selectedLot.price));
  //   $('#lot-price-wrapper').show();
  // } else {
  //    $('#lot-discount-wrapper').hide();
  //   $('#lot-price-wrapper').hide();
  // }
}

function calcPayments(initialPaymentPercentage) {
  if (!CCalc.selectedLot) return;
  var payments = {
    finalPrice: 0,
    discount: 0,
    initial: {
      percentage: 0,
      amount: 0,
    },
    deferred: {
      percentage: 0,
      amount: 0,
      monthly: 0,
      term: 1,
    },
    final: {
      percentage: 0,
      amount: 0,
    },
  };
  var policy = CCalc.selectedPlan;
  if (!policy) return;
  payments.discount = policy.discount;
  var discount = CCalc.selectedLot.listPrice * policy.discount / 100;
  payments.finalPrice = CCalc.selectedLot.listPrice - discount;

  payments.initial.percentage = initialPaymentPercentage;
  payments.initial.amount = payments.finalPrice * initialPaymentPercentage / 100;
  payments.final.percentage = policy.final;
  payments.final.amount = payments.finalPrice * policy.final / 100;
  payments.deferred.percentage = policy.deferred;
  payments.deferred.amount = payments.finalPrice - payments.initial.amount - payments.final.amount;
  payments.deferred.monthly = payments.deferred.amount / policy.term;
  payments.deferred.term = policy.term;
  console.log('Payments');
  console.log(payments);
  return payments;
}

function beforePan(oldPan, newPan) {
  var stopHorizontal = false
    , stopVertical = false
    , gutterWidth = 100
    , gutterHeight = 100
    // Computed variables
    , sizes = this.getSizes()
    , leftLimit = -((sizes.viewBox.x + sizes.viewBox.width) * sizes.realZoom) + gutterWidth
    , rightLimit = sizes.width - gutterWidth - (sizes.viewBox.x * sizes.realZoom)
    , topLimit = -((sizes.viewBox.y + sizes.viewBox.height) * sizes.realZoom) + gutterHeight
    , bottomLimit = sizes.height - gutterHeight - (sizes.viewBox.y * sizes.realZoom)

  customPan = {}
  customPan.x = Math.max(leftLimit, Math.min(rightLimit, newPan.x))
  customPan.y = Math.max(topLimit, Math.min(bottomLimit, newPan.y))

  return customPan
}

var eventsHandler;

eventsHandler = {
  haltEventListeners: ['touchstart', 'touchend', 'touchmove', 'touchleave', 'touchcancel']
  , init: function (options) {
    var instance = options.instance
      , initialScale = 1
      , pannedX = 0
      , pannedY = 0

    // Init Hammer
    // Listen only for pointer and touch events
    this.hammer = Hammer(options.svgElement, {
      inputClass: Hammer.SUPPORT_POINTER_EVENTS ? Hammer.PointerEventInput : Hammer.TouchInput
    })

    // Enable pinch
    this.hammer.get('pinch').set({ enable: true })

    // Handle double tap
    this.hammer.on('doubletap', function (ev) {
      instance.zoomIn()
    })

    // Handle pan
    this.hammer.on('panstart panmove', function (ev) {
      // On pan start reset panned variables
      if (ev.type === 'panstart') {
        pannedX = 0
        pannedY = 0
      }

      // Pan only the difference
      instance.panBy({ x: ev.deltaX - pannedX, y: ev.deltaY - pannedY })
      pannedX = ev.deltaX
      pannedY = ev.deltaY
    })

    // Handle pinch
    this.hammer.on('pinchstart pinchmove', function (ev) {
      // On pinch start remember initial zoom
      if (ev.type === 'pinchstart') {
        initialScale = instance.getZoom()
        instance.zoomAtPoint(initialScale * ev.scale, { x: ev.center.x, y: ev.center.y })
      }

      instance.zoomAtPoint(initialScale * ev.scale, { x: ev.center.x, y: ev.center.y })
    })

    // Prevent moving the page on some devices when panning over SVG
    options.svgElement.addEventListener('touchmove', function (e) { e.preventDefault(); });
  }

  , destroy: function () {
    this.hammer.destroy()
  }
}

function setLotStatus() {
  $('script[type="application/json"].lot-json').each(function (lot) {
    const lotData = JSON.parse($(this).text());
    const id = String(lotData.id).toUpperCase();
    CCalc.LOTS[id] = lotData;
    const selector = '#' + id;
    $(selector).attr('data-status', CCalc.LOTS[id].status);
    if (CCalc.LOTS[id].status === CCalc.STATUS.AVAILABLE) {
      const nameTextSelector = '#' + id + ' + text:nth-child(5)>tspan';
      const metersTextSelector = '#' + id + ' + text:nth-child(2)>tspan';
      const lotName = CCalc.LOTS[id].name;
      const lotMeters = CCalc.LOTS[id].sqMeters + ' mÂ²';
      $(nameTextSelector).text(lotName);
      $(metersTextSelector).text(lotMeters);
    }
    $('[data-status="sold"] + text:nth-child(2)>tspan').text('Vendido');
  });
  const blueprintImage = $('#lot-blueprint').children('img');
  blueprintImage.attr('crossorigin', 'Anonymus');
  $('[data-status="sold"] + text:nth-child(2)>tspan').text('Vendido');
  $('[data-status="blocked"] + text:nth-child(2)>tspan').text('Apartado');
}

function initMap() {
  CCalc.map = svgPanZoom('#map', {
    dblClickZoomEnabled: false,
    zoomEnabled: false,
    beforePan: beforePan,
    // minZoom: 0.6,
    // maxZoom: 1.25,
    fit: 1,
    center: 1,
    customEventsHandler: eventsHandler,
  });
  $(CCalc.lotSelector).on('click tap', function () {
    const lotId = $(this).attr('id');
    $(CCalc.lotSelector).removeClass(CCalc.selectedClass);
    $(this).addClass(CCalc.selectedClass);
    console.log('Clicked', lotId);
    console.log('Data', CCalc.LOTS[lotId]);
    CCalc.selectedLot = CCalc.LOTS[lotId];
    loadLotData();
    $('#lot-detail-empty').hide();
    $('#lot-detail-info').show();
    $('#initial-select').val(CCalc.selectedPlanName);
    var p = calcPayments(CCalc.selectedPlan.initial);
    loadPaymentsData(p);
  });

  $('#initial-select').change(function () {
    var v = $(this).val();
    console.log('New plan', v);
    CCalc.selectedPlan = CCalc.policies[v];
    console.log(CCalc.selectedPlan);
    CCalc.selectedPlanName = v;
    var p = calcPayments(CCalc.selectedPlan.initial);
    console.log('Payments', p);
    loadPaymentsData(p);
  });
  setLotStatus();
}

function includeHTML() {
  var z, i, elmnt, file, xhttp;
  /* Loop through a collection of all HTML elements: */
  z = document.getElementsByTagName("*");
  for (i = 0; i < z.length; i++) {
    elmnt = z[i];
    /*search for elements with a certain atrribute:*/
    file = elmnt.getAttribute("data-include-svg");
    if (file) {
      /* Make an HTTP request using the attribute value as the file name: */
      xhttp = new XMLHttpRequest();
      xhttp.onreadystatechange = function () {
        if (this.readyState == 4) {
          if (this.status == 200) {
            elmnt.innerHTML = this.responseText;
            initMap()
          }
          if (this.status == 404) { elmnt.innerHTML = "SVG not found."; }
          /* Remove the attribute, and call this function once more: */
          elmnt.removeAttribute("data-include-svg");
          includeHTML();
        }
      }
      xhttp.open("GET", file, true);
      xhttp.send();
      /* Exit the function: */
      return;
    }
  }
}

includeHTML();