<?php

declare(strict_types=1);

use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\Admin\CounterController as AdminCounterController;
use App\Http\Controllers\Admin\ServiceController as AdminServiceController;
use App\Http\Controllers\Admin\TicketHistoryController;
use App\Http\Controllers\Admin\UnitController as AdminUnitController;
use App\Http\Controllers\Admin\UserController as AdminUserController;
use App\Http\Controllers\AttendantController;
use App\Http\Controllers\CallNextTicketController;
use App\Http\Controllers\DisplayController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\KioskController;
use App\Http\Controllers\TicketIssueController;
use App\Http\Controllers\TicketOperationController;
use App\Http\Controllers\TicketReceiptController;
use Illuminate\Support\Facades\Route;

Route::get('/', HomeController::class)->name('home');

Route::get('kiosk/{unit}', KioskController::class)->name('kiosk.show');
Route::post('kiosk/{unit}/tickets', TicketIssueController::class)
    ->middleware('throttle:kiosk')
    ->name('kiosk.tickets.store');
Route::get('kiosk/{unit}/tickets/{ticket}', TicketReceiptController::class)->name('kiosk.receipt');

Route::get('display/{unit}', [DisplayController::class, 'show'])->name('display.show');
Route::get('display/{unit}/state', [DisplayController::class, 'state'])->name('display.state');

Route::middleware(['auth', 'active'])->group(function (): void {
    Route::redirect('dashboard', '/attendant')->name('dashboard');
    Route::get('attendant', [AttendantController::class, 'index'])->name('attendant.index');
    Route::get('attendant/state', [AttendantController::class, 'state'])->name('attendant.state');
    Route::post('attendant/call-next', CallNextTicketController::class)->name('attendant.call-next');

    Route::prefix('attendant/tickets/{ticket}')->name('attendant.tickets.')->group(function (): void {
        Route::post('recall', [TicketOperationController::class, 'recall'])->name('recall');
        Route::post('start', [TicketOperationController::class, 'start'])->name('start');
        Route::post('complete', [TicketOperationController::class, 'complete'])->name('complete');
        Route::post('no-show', [TicketOperationController::class, 'noShow'])->name('no-show');
        Route::post('requeue', [TicketOperationController::class, 'requeue'])->name('requeue');
        Route::post('cancel', [TicketOperationController::class, 'cancel'])->name('cancel');
    });

    Route::prefix('admin')->name('admin.')->middleware('can:admin')->group(function (): void {
        Route::get('/', AdminDashboardController::class)->name('dashboard');
        Route::post('units', [AdminUnitController::class, 'store'])->name('units.store');
        Route::put('units/{unit}', [AdminUnitController::class, 'update'])->name('units.update');
        Route::delete('units/{unit}', [AdminUnitController::class, 'destroy'])->name('units.destroy');
        Route::post('services', [AdminServiceController::class, 'store'])->name('services.store');
        Route::put('services/{service}', [AdminServiceController::class, 'update'])->name('services.update');
        Route::delete('services/{service}', [AdminServiceController::class, 'destroy'])->name('services.destroy');
        Route::post('counters', [AdminCounterController::class, 'store'])->name('counters.store');
        Route::put('counters/{counter}', [AdminCounterController::class, 'update'])->name('counters.update');
        Route::delete('counters/{counter}', [AdminCounterController::class, 'destroy'])->name('counters.destroy');
        Route::post('users', [AdminUserController::class, 'store'])->name('users.store');
        Route::put('users/{user}', [AdminUserController::class, 'update'])->name('users.update');
        Route::delete('users/{user}', [AdminUserController::class, 'destroy'])->name('users.destroy');
        Route::get('tickets/{ticket}', TicketHistoryController::class)->name('tickets.show');
    });
});

require __DIR__.'/settings.php';
